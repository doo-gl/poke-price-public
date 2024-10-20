import {PokemonTcgCardMarketPriceInfo} from "../../../../client/PokemonTcgApiClientV2";
import {CardMarketPrices, ItemEntity} from "../../../item/ItemEntity";
import {CurrencyCode} from "../../../money/CurrencyCodes";
import {toCard} from "../../../item/CardItem";
import {currencyExchanger} from "../../../money/CurrencyExchanger";
import moment from "moment";
import {CurrencyAmountLike, fromOptionalCurrencyAmountLike} from "../../../money/CurrencyAmount";
import {CardVariant} from "../../../card/CardEntity";
import {removeNulls} from "../../../../tools/ArrayNullRemover";

const extractEuroPrices = (item:ItemEntity, details:PokemonTcgCardMarketPriceInfo):CardMarketPrices|null => {
  const variant = toCard(item)?.variant ?? null
  if (!variant) {
    return null
  }
  if (variant !== CardVariant.DEFAULT && variant !== CardVariant.REVERSE_HOLO) {
    return null
  }
  // all Card Market are given in EUR
  const currencyCode = CurrencyCode.EUR
  const lastUpdatedAt = moment(details.updatedAt, "YYYY-MM-DD").toDate()
  const toCurrency = (val:number|undefined|null):CurrencyAmountLike|null => {
    if (val === undefined || val === null) {
      return null
    }
    return {currencyCode, amountInMinorUnits: val * 100} // amount is in major units, so need to convert to minor units
  }
  return {
    currencyCode,
    currencyCodeUsed: currencyCode,
    lastUpdatedAt,
    lowPrice: toCurrency(variant === CardVariant.REVERSE_HOLO ? details?.prices?.reverseHoloLow : details?.prices?.lowPrice),
    trendPrice: toCurrency(variant === CardVariant.REVERSE_HOLO ? details.prices?.reverseHoloTrend : details.prices?.trendPrice),
    averageSellPrice: toCurrency(variant === CardVariant.REVERSE_HOLO ? details.prices?.reverseHoloSell : details.prices?.averageSellPrice),
    averageOneDay: toCurrency(variant === CardVariant.REVERSE_HOLO ? details.prices?.reverseHoloAvg1 : details.prices?.avg1),
    averageSevenDay: toCurrency(variant === CardVariant.REVERSE_HOLO ? details.prices?.reverseHoloAvg7 : details.prices?.avg7),
    averageThirtyDay: toCurrency(variant === CardVariant.REVERSE_HOLO ? details.prices?.reverseHoloAvg30 : details.prices?.avg30),
  }
}

const mapDetailsForCurrency = async (priceInfo:PokemonTcgCardMarketPriceInfo, item:ItemEntity, toCurrencyCode:CurrencyCode):Promise<CardMarketPrices|null> => {
  const eurCardMarketPrices = extractEuroPrices(item, priceInfo)
  if (!eurCardMarketPrices) {
    return null
  }

  const fromCurrencyCode = eurCardMarketPrices.currencyCode
  const exchangeRate = await currencyExchanger.getOptionalRate(fromCurrencyCode, toCurrencyCode, moment().subtract(1, "day"))
  if (!exchangeRate) {
    return null
  }
  const lastUpdatedAt = moment(priceInfo.updatedAt, "YYYY-MM-DD").toDate()
  const convert = (val:CurrencyAmountLike|null):CurrencyAmountLike|null => {
    if (!val) {
      return null
    }
    return currencyExchanger.convert(
      val,
      toCurrencyCode,
      exchangeRate
    )
  }


  return {
    currencyCode: toCurrencyCode,
    currencyCodeUsed: fromCurrencyCode,
    lastUpdatedAt,
    lowPrice: convert(eurCardMarketPrices.lowPrice),
    trendPrice: convert(eurCardMarketPrices.trendPrice),
    averageSellPrice: convert(eurCardMarketPrices.averageSellPrice),
    averageOneDay: convert(eurCardMarketPrices.averageOneDay),
    averageSevenDay: convert(eurCardMarketPrices.averageSevenDay),
    averageThirtyDay: convert(eurCardMarketPrices.averageThirtyDay),
  }
}

const map = async (
  item:ItemEntity,
  currencies:Array<CurrencyCode>,
  cardMarketScrapedPrices:PokemonTcgCardMarketPriceInfo|null
):Promise<Array<CardMarketPrices>> => {
  if (!cardMarketScrapedPrices) {
    return []
  }

  const mappedPrices = await Promise.all(currencies.map(currency => mapDetailsForCurrency(
    cardMarketScrapedPrices,
    item,
    currency
  )))
  return removeNulls(mappedPrices)
}

export const cardMarketPriceMapper = {
  map,
  extractEuroPrices,
}