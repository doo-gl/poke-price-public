import {HistoricalCardPriceEntity} from "../../historical-card-price/HistoricalCardPriceEntity";
import {CardPriceSelectionEntity, PriceType} from "./CardPriceSelectionEntity";
import {CardCondition} from "../../historical-card-price/CardCondition";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {ebayCardSearchParamCreator} from "../../ebay/search-param/EbayCardSearchParamCreator";
import {cardPriceSelectionGenerator} from "./CardPriceSelectionGenerator";
import {cardStatsGenerator} from "./CardStatsGenerator";
import {EbayOpenListingEntity} from "../../ebay/open-listing/EbayOpenListingEntity";

interface ExpectedSelection {
  condition:CardCondition,
  priceType:PriceType,
  currencyCode:CurrencyCode
}

const generateForPrice = async (
  price:HistoricalCardPriceEntity,
  existingSelections:Array<CardPriceSelectionEntity>
):Promise<Array<CardPriceSelectionEntity>> => {
  return generate(
    price.cardId,
    PriceType.SOLD_PRICE,
    price.condition,
    price.currencyAmount.currencyCode,
    existingSelections
  );
}

const generateForListing = async (
  listing:EbayOpenListingEntity,
  existingSelections:Array<CardPriceSelectionEntity>
):Promise<Array<CardPriceSelectionEntity>> => {
  return generate(
    listing.cardId,
    PriceType.LISTING_PRICE,
    listing.condition,
    listing.mostRecentPrice.currencyCode,
    existingSelections
  );
}

const generate = async (
  cardId:string,
  priceType:PriceType,
  condition:CardCondition,
  currencyCode:CurrencyCode,
  existingSelections:Array<CardPriceSelectionEntity>
):Promise<Array<CardPriceSelectionEntity>> => {
  const hasExpectedSelection = existingSelections.some(selection =>
    selection.condition === condition
    && selection.priceType === priceType
    && selection.currencyCode === currencyCode
    && selection.cardId === cardId
  );
  if (hasExpectedSelection) {
    return existingSelections;
  }
  const searchParams = await ebayCardSearchParamCreator.getOrCreateSearchParams(cardId);
  const createdSelection = await cardPriceSelectionGenerator.createSelection(searchParams, priceType, condition, currencyCode)
  const createdStats = await cardStatsGenerator.generateForSelection(createdSelection);
  return existingSelections.concat(createdSelection);
}


export const missingSelectionGenerator = {
  generateForPrice,
  generateForListing,
}