import {CurrencyCode} from "./CurrencyCode";
import {comparatorBuilder} from "./ComparatorBuilder";
import {CurrencyAmountLike} from "./CurrencyAmount";

export enum PriceType {
  LISTING = 'LISTING',
  SALE = 'SALE'
}

export interface PublicItemPriceInfo {
  currencyCode:CurrencyCode,
  priceType:PriceType,
  volume:number|null,
  periodSizeDays:number|null,
  minPrice:CurrencyAmountLike|null,
  lowPrice:CurrencyAmountLike|null,
  price:CurrencyAmountLike|null,
  highPrice:CurrencyAmountLike|null,
  maxPrice:CurrencyAmountLike|null,
  lastUpdatedAt:Date|null,
  currenciesUsed:Array<CurrencyCode>|null,
}

const query = (currencyCode:CurrencyCode, priceType:PriceType, itemPrices:any):PublicItemPriceInfo|null => {
  // find the prices with the smallest period that have more than 6 volume
  const matchingPrices = itemPrices.prices.filter((priceDetails:any) =>
    priceDetails.currencyCode === currencyCode && priceDetails.priceType === priceType
  )
  if (matchingPrices.length === 0) {
    return null;
  }
  matchingPrices.sort(comparatorBuilder.combineAll<any>(
    comparatorBuilder.objectAttributeASC(value => value.periodSizeDays ?? Number.MAX_SAFE_INTEGER),
    comparatorBuilder.objectAttributeASC(value => value.currenciesUsed?.length ?? Number.MAX_SAFE_INTEGER),
  ))
  for (let priceIndex = 0; priceIndex < matchingPrices.length; priceIndex++) {
    const priceDetails = matchingPrices[priceIndex]
    if ((priceDetails.volume ?? 0) >= 6) {
      return priceDetails;
    }
  }
  return matchingPrices[matchingPrices.length - 1];
}

const currentItemPrice = (item:any|null, preferredCurrency?:CurrencyCode|null):CurrencyAmountLike|null => {
  if (!item) {
    return null;
  }
  const details = query(preferredCurrency ?? CurrencyCode.GBP, PriceType.SALE, item.itemPrices);
  if (!details) {
    return null;
  }
  return details.price
}

const soldDetails = (item:any|null, preferredCurrency?:CurrencyCode|null):PublicItemPriceInfo|null => {
  if (!item) {
    return null;
  }
  return query(preferredCurrency ?? CurrencyCode.GBP, PriceType.SALE, item.itemPrices)
}

const listingDetails = (item:any|null, preferredCurrency?:CurrencyCode|null):PublicItemPriceInfo|null => {
  if (!item) {
    return null;
  }
  return query(preferredCurrency ?? CurrencyCode.GBP, PriceType.LISTING, item.itemPrices)
}

export const itemPriceQuerier = {
  query,
  soldDetails,
  listingDetails,
  currentItemPrice,
}