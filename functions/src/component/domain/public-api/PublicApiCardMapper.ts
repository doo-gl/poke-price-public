import {CardEntity, CardVariant} from "../card/CardEntity";
import {CurrencyAmountLike} from "../money/CurrencyAmount";
import {
  CardMarketPrices,
  ItemEntity,
  ItemPriceDetails,
  legacyIdOrFallback,
  PriceType,
  TcgPlayerPrices,
} from "../item/ItemEntity";
import {toCard} from "../item/CardItem";
import {itemPriceQuerier} from "../item/ItemPriceQuerier";
import {CurrencyCode} from "../money/CurrencyCodes";
import {dedupe} from "../../tools/ArrayDeduper";
import {removeNulls} from "../../tools/ArrayNullRemover";

export interface EbayPriceDetails {
  currencyCode:CurrencyCode,
  priceType:PriceType,
  volume:number|null,
  periodSizeDays:number|null,
  minPrice:CurrencyAmountLike|null,
  firstQuartile:CurrencyAmountLike|null,
  median:CurrencyAmountLike|null,
  mean:CurrencyAmountLike|null,
  thirdQuartile:CurrencyAmountLike|null,
  maxPrice:CurrencyAmountLike|null,
  stdDev:CurrencyAmountLike|null,
  lastUpdatedAt:Date|null,
  currenciesUsed:Array<CurrencyCode>|null
}

export interface TcgPlayerDetails {
  currencyCode:CurrencyCode,
  low:CurrencyAmountLike|null,
  mid:CurrencyAmountLike|null,
  high:CurrencyAmountLike|null,
  market:CurrencyAmountLike|null,
  directLow:CurrencyAmountLike|null,
  lastUpdatedAt:Date|null,
  currencyCodeUsed:CurrencyCode,
}

export interface CardMarketDetails {
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

export interface Prices {
  ebay:Array<EbayPriceDetails>,
  tcgPlayer:Array<TcgPlayerDetails>,
  cardMarket:Array<CardMarketDetails>,
}

export interface PublicApiCardDto {
  cardId:string,
  name:string,
  cardNumber:string,
  setNumber:string,
  setId:string,
  set:string,
  series:string,
  variant:CardVariant,
  superType:string,
  types:Array<string>,
  subTypes:Array<string>,
  rarity:string|null,
  pokemon:Array<string>,
  artist:string|null,

  minSoldPrice:CurrencyAmountLike|null,
  lowSoldPrice:CurrencyAmountLike|null,
  soldPrice:CurrencyAmountLike|null,
  highSoldPrice:CurrencyAmountLike|null,
  maxSoldPrice:CurrencyAmountLike|null,
  soldVolume:number|null,
  soldLastUpdatedAt:string|null
  minListingPrice:CurrencyAmountLike|null,
  lowListingPrice:CurrencyAmountLike|null,
  listingPrice:CurrencyAmountLike|null,
  highListingPrice:CurrencyAmountLike|null,
  maxListingPrice:CurrencyAmountLike|null,
  listingVolume:number|null,
  listingLastUpdatedAt:string|null

  prices:Prices,
}

const mapEbayPrice = (itemPriceDetails:ItemPriceDetails):EbayPriceDetails|null => {
  if (itemPriceDetails.modificationKey) {
    return null
  }

  return {
    currencyCode: itemPriceDetails.currencyCode,
    priceType: itemPriceDetails.priceType,
    currenciesUsed: itemPriceDetails.currenciesUsed,
    lastUpdatedAt: itemPriceDetails.lastUpdatedAt,
    periodSizeDays: itemPriceDetails.periodSizeDays,
    volume: itemPriceDetails.volume ?? null,
    stdDev: itemPriceDetails.stdDev ?? null,
    minPrice: itemPriceDetails.minPrice ?? null,
    firstQuartile: itemPriceDetails.firstQuartile ?? null,
    median: itemPriceDetails.median ?? null,
    mean: itemPriceDetails.mean ?? null,
    thirdQuartile: itemPriceDetails.thirdQuartile ?? null,
    maxPrice: itemPriceDetails.maxPrice ?? null,
  }
}

const mapTcgPlayerPrice = (tcgPlayerPrices:TcgPlayerPrices):TcgPlayerDetails => {
  return {
    currencyCode: tcgPlayerPrices.currencyCode,
    currencyCodeUsed: tcgPlayerPrices.currencyCodeUsed,
    lastUpdatedAt: tcgPlayerPrices.lastUpdatedAt,
    low: tcgPlayerPrices.low,
    mid: tcgPlayerPrices.mid,
    high: tcgPlayerPrices.high,
    directLow: tcgPlayerPrices.directLow,
    market: tcgPlayerPrices.market,
  }
}

const mapCardMarket = (cardMarketPrices:CardMarketPrices):CardMarketDetails => {
  return {
    currencyCode: cardMarketPrices.currencyCode,
    currencyCodeUsed: cardMarketPrices.currencyCodeUsed,
    lastUpdatedAt: cardMarketPrices.lastUpdatedAt,
    lowPrice: cardMarketPrices.lowPrice,
    averageSellPrice: cardMarketPrices.averageSellPrice,
    trendPrice: cardMarketPrices.trendPrice,
    averageOneDay: cardMarketPrices.averageOneDay,
    averageSevenDay: cardMarketPrices.averageSevenDay,
    averageThirtyDay: cardMarketPrices.averageThirtyDay,
  }
}

const mapPrices = (card:ItemEntity):Prices => {
  return {
    ebay: removeNulls(card.itemPrices.prices.map(mapEbayPrice)),
    cardMarket: card.itemPrices.sourcedPrices?.cardMarketPrices.map(mapCardMarket) ?? new Array<CardMarketDetails>(),
    tcgPlayer: card.itemPrices.sourcedPrices?.tcgPlayerPrices.map(mapTcgPlayerPrice) ?? new Array<TcgPlayerDetails>(),
  }
}

const map = (card:ItemEntity):PublicApiCardDto|null => {
  const details = toCard(card)
  if (!details) {
    return null;
  }
  const soldDetails = itemPriceQuerier.soldDetails(card);
  const listingDetails = itemPriceQuerier.listingDetails(card);
  return {
    cardId: legacyIdOrFallback(card),
    name: card.displayName,
    cardNumber: details.cardNumber,
    setNumber: details.setNumber,
    setId: details.setId,
    set: details.set,
    series: details.series,
    variant: details.variant,
    superType: details.superType,
    types: details.energyTypes,
    subTypes: details.subTypes,
    rarity: details.rarity,
    pokemon: details.pokemon,
    artist: details.artist,

    minSoldPrice: soldDetails?.minPrice ?? null,
    lowSoldPrice: soldDetails?.lowPrice ?? null,
    soldPrice: soldDetails?.price ?? null,
    highSoldPrice: soldDetails?.highPrice ?? null,
    maxSoldPrice: soldDetails?.maxPrice ?? null,
    soldVolume: soldDetails?.volume ?? null,
    soldLastUpdatedAt: soldDetails?.lastUpdatedAt?.toISOString() ?? null,
    minListingPrice: listingDetails?.minPrice ?? null,
    lowListingPrice: listingDetails?.lowPrice ?? null,
    listingPrice: listingDetails?.price ?? null,
    highListingPrice: listingDetails?.highPrice ?? null,
    maxListingPrice: listingDetails?.maxPrice ?? null,
    listingVolume: listingDetails?.volume ?? null,
    listingLastUpdatedAt: listingDetails?.lastUpdatedAt?.toISOString() ?? null,

    prices: mapPrices(card),
  }
}

export const publicApiCardMapper = {
  map,
}