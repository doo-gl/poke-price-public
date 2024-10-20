import {CurrencyCode} from "../money/CurrencyCodes";
import {PriceType} from "../item/ItemEntity";
import {CurrencyAmountLike} from "../money/CurrencyAmount";


export interface CardSet {
  tcgApiId:string,
  pokePriceId:string,
  cards:Array<CardV2>
}

export interface Card {
  tcgApiId:string,
  pokePriceId:string,
  pokePriceLink:string,
  gbpSales:PricePoint|null,
  gbpListings:PricePoint|null,
  usdSales:PricePoint|null,
  usdListings:PricePoint|null,
}

export interface PricePoint {
  currencyCode:CurrencyCode
  priceType:PriceType
  currenciesUsed:Array<CurrencyCode>|null
  periodSizeDays:number|null,
  volume:number|null,
  minPrice:CurrencyAmountLike|null,
  firstQuartile:CurrencyAmountLike|null,
  median:CurrencyAmountLike|null,
  thirdQuartile:CurrencyAmountLike|null,
  maxPrice:CurrencyAmountLike|null,
  stdDev:CurrencyAmountLike|null,
  mean:CurrencyAmountLike|null,
}

export interface CardV2 {
  tcgApiId:string,
  pokePriceId:string,
  pokePriceLink:string,
  usdPrices:CardPrices,
  gbpPrices:CardPrices,
}

export interface CardPrices {
  currencyCode:CurrencyCode,
  url:string,
  rawEbaySales:CardPricePoint|null,
  rawEbayListings:CardPricePoint|null,
  gradedPrices:Array<GradedPricePoint>
}

export interface CardPricePoint {
  volume:number|null,
  low:number|null,
  average:number|null,
  high:number|null,
}

export interface GradedPricePoint extends CardPricePoint {
  gradingCompany:string,
  grade:string,
}