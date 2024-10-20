import {cardPriceSelectionRetriever} from "./CardPriceSelectionRetriever";
import {CardPriceSelectionEntity, PriceType} from "./CardPriceSelectionEntity";
import {HistoricalCardPriceEntity, State} from "../../historical-card-price/HistoricalCardPriceEntity";
import {CardDataSource} from "../../card/CardDataSource";
import {searchParamValidator} from "../../ebay/search-param/SearchParamValidator";
import {logger} from "firebase-functions";
import {PriceDataType} from "../../historical-card-price/PriceDataType";
import {BatchUpdate} from "../../../database/BaseCrudRepository";
import {historicalCardPriceRepository} from "../../historical-card-price/HistoricalCardPriceRepository";
import {historicalCardPriceUpdater} from "../../historical-card-price/HistoricalCardPriceUpdater";
import {missingSelectionGenerator} from "./MissingSelectionGenerator";
import {cardSelectionUniquenessEnforcer} from "./CardSelectionUniquenessEnforcer";
import {cardStatsRetrieverV2} from "./CardStatsRetriever";

const isPriceInSelection = (selection:CardPriceSelectionEntity, price:HistoricalCardPriceEntity):boolean => {

  if (
    price.sourceType !== CardDataSource.EBAY_CARD_LISTING
    || price.priceDataType !== PriceDataType.SOLD_PRICE
    || selection.priceType !== PriceType.SOLD_PRICE
    || price.state !== State.ACTIVE
  ) {
    return false;
  }

  if (
    price.currencyAmount.currencyCode !== selection.currencyCode
    || price.condition !== selection.condition
    || price.cardId !== selection.cardId
  ) {
    return false;
  }

  const details = price.sourceDetails;
  // @ts-ignore
  if (!details || !details.listingName) {
    return false;
  }

  // @ts-ignore
  const listingName:string = details.listingName;
  const validationResult = searchParamValidator.validate(selection.searchParams, listingName);
  if (!validationResult.isValid) {
    logger.info(`Price with id: ${price.id} does not match selection: ${selection.id}: ${validationResult.reasons.join(', ')}`);
    return false;
  }

  return true;
}

const reconcilePrices = async (selection:CardPriceSelectionEntity, prices:Array<HistoricalCardPriceEntity>):Promise<void> => {
  const updates:Array<BatchUpdate<HistoricalCardPriceEntity>> = [];
  prices.forEach(price => {
    const selectionIds = price.selectionIds ?? []
    const priceInSelection = isPriceInSelection(selection, price);
    const priceHasSelectionId = selectionIds.some(selectionId => selectionId === selection.id)
    if (priceInSelection && !priceHasSelectionId) {
      const newSelectionIds = selectionIds.concat([selection.id])
      updates.push({ id: price.id, update: { selectionIds: newSelectionIds } })
    }
    if (!priceInSelection && priceHasSelectionId) {
      const newSelectionIds = selectionIds.filter(selectionId => selectionId !== selection.id)
      updates.push({ id: price.id, update: { selectionIds: newSelectionIds } })
    }
  })
  await historicalCardPriceRepository.batchUpdate(updates);
}

const reconcile = async (selectionId:string):Promise<void> => {
  const selection = await cardPriceSelectionRetriever.retrieve(selectionId);

  await historicalCardPriceRepository.iterator()
    .queries([
      { field: "selectionIds", operation: "array-contains", value: selectionId },
    ])
    .iterateBatch(async prices => {
      await reconcilePrices(selection, prices);
      return false;
    })

  await historicalCardPriceRepository.iterator()
    .queries([
      { field: "cardId", operation: "==", value: selection.cardId },
      { field: "searchIds", operation: "array-contains", value: selection.searchId },
      { field: "sourceType", operation: "==", value: CardDataSource.EBAY_CARD_LISTING },
      { field: "priceDataType", operation: "==", value: PriceDataType.SOLD_PRICE },
      { field: "condition", operation: "==", value: selection.condition },
      { field: "currencyAmount.currencyCode", operation: "==", value: selection.currencyCode },
    ])
    .iterateBatch(async prices => {
      await reconcilePrices(selection, prices);
      return false;
    })
}

const reconcilePrice = async (price:HistoricalCardPriceEntity):Promise<void> => {
  const existingSelections = await cardPriceSelectionRetriever.retrieveForCardId(price.cardId);
  const existingStats = await cardStatsRetrieverV2.retrieveForCardId(price.cardId)
  const uniqueSelections = await cardSelectionUniquenessEnforcer.enforce(existingSelections, existingStats)
  const selections = await missingSelectionGenerator.generateForPrice(price, uniqueSelections.selections);
  const newSelectionIds = selections
    .filter(selection => isPriceInSelection(selection, price))
    .map(selection => selection.id);
  await historicalCardPriceUpdater.update(price.id, { selectionIds: newSelectionIds })
}

export const cardSelectionPriceReconciler = {
  reconcile,
  reconcilePrice,
  isPriceInSelection,
}