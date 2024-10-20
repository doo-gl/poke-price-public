import {EbayCardSearchParamEntity} from "../../ebay/search-param/EbayCardSearchParamEntity";
import {ebaySearchParamRetriever} from "../../ebay/search-param/EbayCardSearchParamRetriever";
import {ebayCardSearchParamCreator} from "../../ebay/search-param/EbayCardSearchParamCreator";
import {cardPriceSelectionCreator, CardPriceSelectionEntity, PriceType} from "./CardPriceSelectionEntity";
import {Create} from "../../../database/Entity";
import {CardCondition} from "../../historical-card-price/CardCondition";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {cardPriceSelectionRetriever} from "./CardPriceSelectionRetriever";
import {PriceDataType} from "../../historical-card-price/PriceDataType";
import {historicalCardPriceRetriever} from "../../historical-card-price/HistoricalCardPriceRetriever";
import {ebayOpenListingRetriever} from "../../ebay/open-listing/EbayOpenListingRetriever";

interface Dimension {
  condition:CardCondition,
  currencyCode:CurrencyCode,
}

const generateDimensions = ():Array<Dimension> => {
  const dimensions:Array<Dimension> = [];
  Object.values(CardCondition).forEach(condition => {
    Object.values(CurrencyCode).forEach(currencyCode => {
      dimensions.push({ condition, currencyCode });
    })
  })
  return dimensions;
}

const createSelection = async (
  searchParam:EbayCardSearchParamEntity,
  priceType:PriceType,
  condition:CardCondition,
  currencyCode:CurrencyCode,
):Promise<CardPriceSelectionEntity> => {
  const create:Create<CardPriceSelectionEntity> = {
    cardId: searchParam.cardId,
    searchId: searchParam.id,
    searchParams: {
      includeKeywords: searchParam.includeKeywords,
      excludeKeywords: searchParam.excludeKeywords,
    },
    priceType,
    condition,
    currencyCode,
    hasReconciled: false,
  }
  const preExistingSelection = await cardPriceSelectionRetriever.retrievePreExisting(create);
  if (preExistingSelection) {
    return preExistingSelection;
  }
  return await cardPriceSelectionCreator.create(create);
}

const tryCreateSelection = async (
  searchParam:EbayCardSearchParamEntity,
  condition:CardCondition,
  currencyCode:CurrencyCode,
):Promise<Array<CardPriceSelectionEntity> | null> => {
  const priceExists = await historicalCardPriceRetriever.priceExists(searchParam.id, PriceDataType.SOLD_PRICE, currencyCode, condition,);
  const listingExists = await ebayOpenListingRetriever.listingExists(searchParam.id, condition, currencyCode)
  if (!priceExists && !listingExists) {
    return null;
  }
  return Promise.all([
    createSelection(searchParam, PriceType.SOLD_PRICE, condition, currencyCode),
    createSelection(searchParam, PriceType.LISTING_PRICE, condition, currencyCode),
  ])
}

const generate = async (cardId:string):Promise<void> => {
  const searchParams = await ebayCardSearchParamCreator.getOrCreateSearchParams(cardId);
  const dimensions = generateDimensions();
  await Promise.all(
    dimensions.map(dimension => tryCreateSelection(searchParams, dimension.condition, dimension.currencyCode))
  )
}

export const cardPriceSelectionGenerator = {
  generate,
  createSelection,
}