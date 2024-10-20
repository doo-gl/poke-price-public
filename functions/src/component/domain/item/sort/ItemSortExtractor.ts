import {ItemEntity, ItemSort, PriceType} from "../ItemEntity";
import {itemPriceQuerier} from "../ItemPriceQuerier";
import {CurrencyCode} from "../../money/CurrencyCodes";


const extract = (item:ItemEntity):ItemSort => {
  const ukPokePrice = itemPriceQuerier.pokePrice(item, CurrencyCode.GBP)
  const usPokePrice = itemPriceQuerier.pokePrice(item, CurrencyCode.USD)
  const ukSoldDetails = itemPriceQuerier.query(CurrencyCode.GBP, PriceType.SALE, item.itemPrices);
  const usSoldDetails = itemPriceQuerier.query(CurrencyCode.USD, PriceType.SALE, item.itemPrices);
  return {
    name: item.name,
    ukPrice: ukPokePrice?.price?.amountInMinorUnits ?? null,
    ukSales: ukSoldDetails?.volume ?? null,
    usPrice: usPokePrice?.price?.amountInMinorUnits ?? null,
    usSales: usSoldDetails?.volume ?? null,
  }
}

export const itemSortExtractor = {
  extract,
}