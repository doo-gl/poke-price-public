import {EbayCardSearchParamEntity} from "./EbayCardSearchParamEntity";
import {ebaySearchParamRetriever} from "./EbayCardSearchParamRetriever";
import {historicalCardPriceRepository} from "../../historical-card-price/HistoricalCardPriceRepository";
import {HistoricalCardPriceEntity, State} from "../../historical-card-price/HistoricalCardPriceEntity";
import {BatchUpdate, QueryOptions} from "../../../database/BaseCrudRepository";
import {CardDataSource} from "../../card/CardDataSource";
import {searchParamValidator} from "./SearchParamValidator";
import {logger} from "firebase-functions";
import {ebaySearchParamUpdater} from "./EbayCardSearchParamUpdater";
import {ebayOpenListingReconciler} from "../open-listing/EbayOpenListingReconciller";
import {lodash} from "../../../external-lib/Lodash";
import {TimestampStatic} from "../../../external-lib/Firebase";

export interface ReconcileResult {
  cardId:string,
  searchId:string,
  numberOfPricesProcessed:number,
  numberOfPricesUpdated:number,
}

const BATCH_SIZE = 50;

const isPriceInSearch = (searchParams:EbayCardSearchParamEntity, price:HistoricalCardPriceEntity):boolean => {
  if (
    price.sourceType !== CardDataSource.EBAY_CARD_LISTING
    || price.state === State.INACTIVE
    || !price.sourceDetails
    || !price.sourceDetails.listingName
  ) {
    return false;
  }

  const listingName:string = price.sourceDetails.listingName;
  const validationResult = searchParamValidator.validate(searchParams, listingName);
  if (!validationResult.isValid) {
    logger.info(`Price with id: ${price.id} does not match search: ${searchParams.id}: ${validationResult.reasons.join(', ')}`);
  }
  return validationResult.isValid
}

const reconcileBatch = async (searchParams:EbayCardSearchParamEntity, prices:Array<HistoricalCardPriceEntity>):Promise<ReconcileResult> => {
  logger.info(`Reconciling batch of ${prices.length} against search: ${searchParams.id}`)
  const batchUpdates:Array<BatchUpdate<HistoricalCardPriceEntity>> = [];
  prices.forEach(price => {

    if (price.sourceType !== CardDataSource.EBAY_CARD_LISTING) {
      return;
    }

    const newSearchIds = price.searchIds.slice()
      .filter(searchId => searchId !== searchParams.id);

    if (isPriceInSearch(searchParams, price)) {
      newSearchIds.push(searchParams.id)
    }

    newSearchIds.sort();
    if (lodash.isNotEqual(newSearchIds, price.searchIds)) {
      const batchUpdate:BatchUpdate<HistoricalCardPriceEntity> = {
        id: price.id,
        update: { searchIds: newSearchIds },
      }
      logger.info(`Associating price: ${price.id} with search: ${searchParams.id}`)
      batchUpdates.push(batchUpdate);
    }

  });

  await historicalCardPriceRepository.batchUpdate(batchUpdates);

  return {
    cardId: searchParams.cardId,
    searchId: searchParams.id,
    numberOfPricesProcessed: prices.length,
    numberOfPricesUpdated: batchUpdates.length,
  }
}

const reconcileInBatches = async (searchParams:EbayCardSearchParamEntity, startAfterId:string|null):Promise<ReconcileResult> => {
  const queryOptions:QueryOptions<HistoricalCardPriceEntity> = startAfterId
    ? {limit: BATCH_SIZE, startAfterId}
    : {limit: BATCH_SIZE}

  const cardPriceBatch = await historicalCardPriceRepository.getMany([{ field: "cardId", operation: "==", value: searchParams.cardId }], queryOptions)
  if (cardPriceBatch.length === 0) {
    return { cardId: searchParams.cardId, searchId: searchParams.id, numberOfPricesProcessed: 0, numberOfPricesUpdated: 0 };
  }
  const lastPriceId = cardPriceBatch[cardPriceBatch.length - 1].id;

  const reconcileResult = await reconcileBatch(searchParams, cardPriceBatch);
  const nextReconcileResult = await reconcileInBatches(searchParams, lastPriceId);
  return {
    cardId: reconcileResult.cardId,
    searchId: reconcileResult.searchId,
    numberOfPricesProcessed: reconcileResult.numberOfPricesProcessed + nextReconcileResult.numberOfPricesProcessed,
    numberOfPricesUpdated: reconcileResult.numberOfPricesUpdated + nextReconcileResult.numberOfPricesUpdated,
  }
}

const reconcile = async (ebaySearchParamId:string):Promise<ReconcileResult> => {

  const searchParams = await ebaySearchParamRetriever.retrieve(ebaySearchParamId);
  const reconcileResult = await reconcileInBatches(searchParams, null);
  const reconcileOpenListingResult = await ebayOpenListingReconciler.reconcileInBatches(searchParams, null);
  const updatedSearchParams = await ebaySearchParamUpdater.update(searchParams.id, { lastReconciled: TimestampStatic.now() });
  logger.info(`Reconciled ${reconcileResult.numberOfPricesProcessed} prices against search: ${reconcileResult.searchId}, ${reconcileResult.numberOfPricesUpdated} prices were associated with the search`)
  logger.info(`Reconciled ${reconcileOpenListingResult.numberOfListingsProcessed} listings against search: ${reconcileOpenListingResult.searchId}, ${reconcileOpenListingResult.numberOfListingsUpdated} listings were associated with the search`)
  return reconcileResult;
}

export const ebaySearchParamPriceReconciler = {
  reconcile,
  isPriceInSearch,
}