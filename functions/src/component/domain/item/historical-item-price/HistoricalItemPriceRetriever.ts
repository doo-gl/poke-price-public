import {HistoricalItemPriceEntity, historicalItemPriceRepository} from "./HistoricalItemPriceEntity";
import {Moment} from "moment";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {ItemPriceDetails, PriceType} from "../ItemEntity";
import {SortOrder} from "../../../database/BaseCrudRepository";
import {momentToTimestamp} from "../../../tools/TimeConverter";

export interface HistoricalItemPriceIdentifier {
  itemId:string,
  currencyCode:CurrencyCode,
  priceType:PriceType,
  modificationKey:string|null,
}

const retrievePriceAtTime = async (time:Moment, identifier:HistoricalItemPriceIdentifier):Promise<HistoricalItemPriceEntity|null> => {
  const prices = await historicalItemPriceRepository.getMany(
    [
      {field: "currencyCode", operation: "==", value: identifier.currencyCode},
      {field: "priceType", operation: "==", value: identifier.priceType},
      {field: "itemId", operation: "==", value: identifier.itemId},
      {field: "modificationKey", operation: "==", value: identifier.modificationKey},
      {field: "timestamp", operation: "<=", value: momentToTimestamp(time)},
    ],
    {limit: 1, sort: [{field: "timestamp", order: SortOrder.DESC}]}
  )
  if (prices.length === 0) {
    return null;
  }
  return prices[0];
}

const retrievePricesFromTime = async (time:Moment, identifier:HistoricalItemPriceIdentifier):Promise<Array<HistoricalItemPriceEntity>> => {
  const prices = await historicalItemPriceRepository.getMany(
    [
      {field: "currencyCode", operation: "==", value: identifier.currencyCode},
      {field: "priceType", operation: "==", value: identifier.priceType},
      {field: "itemId", operation: "==", value: identifier.itemId},
      {field: "modificationKey", operation: "==", value: identifier.modificationKey},
      {field: "timestamp", operation: ">=", value: momentToTimestamp(time)},
    ],
    {sort: [{field: "timestamp", order: SortOrder.ASC}]}
  )
  return prices
}



export const historicalItemPriceRetriever = {
  retrievePriceAtTime,
  retrievePricesFromTime,
}