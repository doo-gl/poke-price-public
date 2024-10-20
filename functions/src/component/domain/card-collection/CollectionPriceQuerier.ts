import {CardCollectionEntity, CardCollectionPriceStats} from "./CardCollectionEntity";
import {CurrencyCode} from "../money/CurrencyCodes";

const queryPriceStats = (pricesStats:Array<CardCollectionPriceStats>, currency:CurrencyCode):CardCollectionPriceStats|null => {
  return pricesStats?.find(priceStat => priceStat.currencyCode === currency) ?? null
}

const query = (collection:CardCollectionEntity, currency:CurrencyCode):CardCollectionPriceStats|null => {
  return collection.statsV2?.prices?.find(priceStat => priceStat.currencyCode === currency) ?? null
}

export const collectionPriceQuerier = {
  query,
  queryPriceStats,
}