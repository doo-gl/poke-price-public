import {CardLanguage, Images, ItemTypeV2, PriceSource, PriceType, SetDetails} from "../ItemEntity";
import {Content} from "../../card/PublicCardDto";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {CurrencyAmountLike} from "../../money/CurrencyAmount";
import {CardVariant} from "../../card/CardEntity";

export interface PublicItemPriceInfo {
  currencyCode:CurrencyCode,
  priceType:PriceType,
  modificationKey:string|null,
  volume:number|null,
  periodSizeDays:number|null,
  minPrice:CurrencyAmountLike|null,
  lowPrice:CurrencyAmountLike|null,
  firstQuartile:CurrencyAmountLike|null,
  price:CurrencyAmountLike|null,
  median:CurrencyAmountLike|null,
  mean:CurrencyAmountLike|null,
  thirdQuartile:CurrencyAmountLike|null,
  highPrice:CurrencyAmountLike|null,
  maxPrice:CurrencyAmountLike|null,
  stdDev:CurrencyAmountLike|null,
  lastUpdatedAt:Date|null,
  currenciesUsed:Array<CurrencyCode>|null
}

export interface PublicTcgPlayerPrices {
  currencyCode:CurrencyCode,
  low:CurrencyAmountLike|null,
  mid:CurrencyAmountLike|null,
  high:CurrencyAmountLike|null,
  market:CurrencyAmountLike|null,
  directLow:CurrencyAmountLike|null,
  lastUpdatedAt:Date|null,
  currencyCodeUsed:CurrencyCode,
}

export interface PublicCardMarketPrices {
  currencyCode:CurrencyCode,
  averageSellPrice:CurrencyAmountLike|null,
  lowPrice:CurrencyAmountLike|null,
  trendPrice:CurrencyAmountLike|null,
  averageOneDay:CurrencyAmountLike|null,
  averageSevenDay:CurrencyAmountLike|null,
  averageThirtyDay:CurrencyAmountLike|null,
  lastUpdatedAt:Date|null,
  currencyCodeUsed:CurrencyCode,
}

export interface PublicSourcedPrices {
  tcgPlayerPrices:Array<PublicTcgPlayerPrices>,
  cardMarketPrices:Array<PublicCardMarketPrices>,
  priceId:string|null,
}

export interface PublicPokePriceDto {
  currencyCode:CurrencyCode,
  currenciesUsed:Array<CurrencyCode>|null,
  lastUpdatedAt:Date|null,
  lowPrice:CurrencyAmountLike|null,
  price:CurrencyAmountLike|null,
  highPrice:CurrencyAmountLike|null,
  priceSource:PriceSource|null,
}

export interface PublicItemPrices {
  prices:Array<PublicItemPriceInfo>
  modificationPrices:Array<PublicItemPriceInfo>,
  sourcedPrices:PublicSourcedPrices,
}

export interface BasicItemDto {
  itemId:string,
  legacyItemId?:string,
  slug:string|null,
  name:string,
  displayName:string,
  images:Images,
  itemType:ItemTypeV2,
  itemDetails:any,
  rating:number|null,
  pokePrices:Array<PublicPokePriceDto>
}

export interface ItemDtoV2 extends BasicItemDto {
  itemPrices:PublicItemPrices,
  content:Content
  tags:Array<string>,
}

export interface PublicCardItemDetails {
  setId:string,
  cardNumber:string,
  setNumber:string,
  variant:CardVariant,
  language:CardLanguage,
  series:string,
  set:string,
  setDetails:SetDetails,
  artist:string|null,
  rarity:string|null,
  subTypes:Array<string>,
  pokemon:Array<string>
}

export interface PublicGenericItemDetails {

}