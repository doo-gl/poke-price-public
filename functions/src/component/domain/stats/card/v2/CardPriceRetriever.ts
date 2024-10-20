import moment, {Moment} from "moment";
import {historicalCardPriceRetriever} from "../../../historical-card-price/HistoricalCardPriceRetriever";
import {PriceDataType} from "../../../historical-card-price/PriceDataType";
import {UnexpectedError} from "../../../../error/UnexpectedError";
import {HistoricalCardPriceEntity} from "../../../historical-card-price/HistoricalCardPriceEntity";
import {CurrencyCode} from "../../../money/CurrencyCodes";
import {EbayOpenListingEntity} from "../../../ebay/open-listing/EbayOpenListingEntity";
import {ebayOpenListingRetriever} from "../../../ebay/open-listing/EbayOpenListingRetriever";
import {CardCondition} from "../../../historical-card-price/CardCondition";

export interface SoldPricesRequest {
  from:Moment|null,
  to:Moment|null,
  lastNResults:number|null,
  priceType:PriceDataType,
  currencyCode:CurrencyCode,
  cardId:string,
  searchId:string,
}

const retrieveSolds = async (request:SoldPricesRequest):Promise<Array<HistoricalCardPriceEntity>> => {
  if (request.lastNResults && request.from && !request.to) {
    const to = moment();
    const prices = await historicalCardPriceRetriever.retrievePricesBetween(
      request.cardId,
      request.searchId,
      PriceDataType.SOLD_PRICE,
      request.currencyCode,
      CardCondition.NEAR_MINT,
      request.from,
      to,
    );
    if (request.lastNResults && prices.length > request.lastNResults) {
      return prices;
    }
    return historicalCardPriceRetriever.retrieveLastNPricesForSearch(
      request.cardId,
      request.searchId,
      PriceDataType.SOLD_PRICE,
      request.currencyCode,
      CardCondition.NEAR_MINT,
      request.lastNResults
    );
  }
  if (request.lastNResults) {
    return historicalCardPriceRetriever.retrieveLastNPricesForSearch(
      request.cardId,
      request.searchId,
      PriceDataType.SOLD_PRICE,
      request.currencyCode,
      CardCondition.NEAR_MINT,
      request.lastNResults
    );
  }
  if (request.from) {
    const to = request.to ? request.to : moment();
    return historicalCardPriceRetriever.retrievePricesBetween(
      request.cardId,
      request.searchId,
      PriceDataType.SOLD_PRICE,
      request.currencyCode,
      CardCondition.NEAR_MINT,
      request.from,
      to,
    );
  }
  throw new UnexpectedError(`Sold price request does not have lastNResults or from properties, Actual: ${JSON.stringify(request)}`)
}

const retrieveOpens = (cardId:string, searchId:string):Promise<Array<EbayOpenListingEntity>> => {
  return ebayOpenListingRetriever.retrieveAllCurrentlyOpen(cardId, searchId, CurrencyCode.GBP);
}

export const cardPriceRetriever = {
  retrieveSolds,
  retrieveOpens,
}