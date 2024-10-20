import {
  ItemPriceHistory,
  ItemPriceHistoryContainer,
  ItemPriceHistoryEntity,
  ItemPriceHistoryPoint,
} from "./ItemPriceHistoryEntity";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {ItemEntity} from "../ItemEntity";
import {HistoricalItemPriceEntity} from "../historical-item-price/HistoricalItemPriceEntity";
import {PokemonTcgApiPriceHistoryEntity} from "../../pokemon-tcg-api-v2/price-scraping/PokemonTcgApiPriceHistoryEntity";
import {HistoricalCurrencyExchanger} from "../../money/CurrencyExchanger";
import {tcgPlayerPriceMapper} from "../../stats/card-v2/v2-2/TcgPlayerPriceMapper";
import {timestampToMoment} from "../../../tools/TimeConverter";
import {cardMarketPriceMapper} from "../../stats/card-v2/v2-2/CardMarketPriceMapper";
import {CurrencyAmountLike} from "../../money/CurrencyAmount";
import {Moment} from "moment";
import {Create} from "../../../database/Entity";
import {logger} from "firebase-functions";

export interface FullItemPriceHistoryContext {
  item:ItemEntity,
  itemPriceHistory:ItemPriceHistoryEntity,
  gbpEbaySales:Array<HistoricalItemPriceEntity>,
  usdEbaySales:Array<HistoricalItemPriceEntity>,
  tcgApiPriceHistory:Array<PokemonTcgApiPriceHistoryEntity>
  gbpExchanger:HistoricalCurrencyExchanger,
  usdExchanger:HistoricalCurrencyExchanger,
}
export type Converter = (amount:CurrencyAmountLike|null, atTime:Moment) => CurrencyAmountLike|null


const mapTcgPlayerToDataPoint = (
  histPrice:PokemonTcgApiPriceHistoryEntity|Create<PokemonTcgApiPriceHistoryEntity>,
  item:ItemEntity,
  convert:Converter
):ItemPriceHistoryPoint => {
  if (!histPrice.tcgPlayer) {
    return {
      timestamp: histPrice.timestamp,
      low: null,
      price:null,
      high:null,
      volume: null,
    }
  }
  // ignore low and high as they are based on listing price
  const usdTcgPlayerDetails = tcgPlayerPriceMapper.extractUsdPrices(item, histPrice.tcgPlayer)
  const convertedPrice = convert(usdTcgPlayerDetails?.market ?? null, timestampToMoment(histPrice.timestamp))
  return {
    timestamp: histPrice.timestamp,
    low: null,
    price: convertedPrice?.amountInMinorUnits ?? null,
    high: null,
    volume: null,
  }
}

const mapCardMarketToDataPoint = (
  histPrice:PokemonTcgApiPriceHistoryEntity|Create<PokemonTcgApiPriceHistoryEntity>,
  item:ItemEntity,
  convert:Converter
):ItemPriceHistoryPoint => {
  if (!histPrice.cardMarket) {
    return {
      timestamp: histPrice.timestamp,
      low: null,
      price:null,
      high:null,
      volume: null,
    }
  }
  // ignore low and high as they are based on listing price
  const eurCardMarketDetails = cardMarketPriceMapper.extractEuroPrices(item, histPrice.cardMarket)
  const convertedPrice = convert(
    eurCardMarketDetails?.averageSellPrice ?? eurCardMarketDetails?.trendPrice ?? eurCardMarketDetails?.averageSevenDay ?? null,
    timestampToMoment(histPrice.timestamp)
  )
  return {
    timestamp: histPrice.timestamp,
    low: null,
    price: convertedPrice?.amountInMinorUnits ?? null,
    high: null,
    volume: null,
  }
}

const createConverter = (exchanger:HistoricalCurrencyExchanger):Converter => {
  return (amount, atTime) => {
    if (!amount) {
      return null
    }
    return exchanger.exchange(amount, atTime)
  }
}

const mapHistoricalPriceEntity = (entity:HistoricalItemPriceEntity|Create<HistoricalItemPriceEntity>):ItemPriceHistoryPoint => {
  return {
    timestamp: entity.timestamp,
    price: entity?.median?.amountInMinorUnits ?? null,
    low: entity?.firstQuartile?.amountInMinorUnits ?? null,
    high: entity?.thirdQuartile?.amountInMinorUnits ?? null,
    volume: entity?.volume ?? null,
  }
}

const calculateFull = (context:FullItemPriceHistoryContext):ItemPriceHistoryContainer => {
  const {
    item,
    itemPriceHistory,
    gbpEbaySales,
    usdEbaySales,
    tcgApiPriceHistory,
    gbpExchanger,
    usdExchanger,
  } = context;

  const fourteenDayGbpEbaySales:ItemPriceHistory = {
    prices: gbpEbaySales.filter(histPrice => histPrice.periodSizeDays === 14).map(mapHistoricalPriceEntity),
    currencyCode: CurrencyCode.GBP,
  };
  const ninetyDayGbpEbaySales:ItemPriceHistory = {
    prices: gbpEbaySales.filter(histPrice => histPrice.periodSizeDays === 90).map(mapHistoricalPriceEntity),
    currencyCode: CurrencyCode.GBP,
  };

  const fourteenDayUsdEbaySales:ItemPriceHistory = {
    prices: usdEbaySales.filter(histPrice => histPrice.periodSizeDays === 14).map(mapHistoricalPriceEntity),
    currencyCode: CurrencyCode.USD,
  };
  const ninetyDayUsdEbaySales:ItemPriceHistory = {
    prices: usdEbaySales.filter(histPrice => histPrice.periodSizeDays === 90).map(mapHistoricalPriceEntity),
    currencyCode: CurrencyCode.USD,
  };

  const tcgPlayerGbp:ItemPriceHistory = {
    prices: tcgApiPriceHistory.map<ItemPriceHistoryPoint>(histPrice => mapTcgPlayerToDataPoint(
      histPrice,
      item,
      createConverter(gbpExchanger)
    )),
    currencyCode: CurrencyCode.GBP,
  }
  const tcgPlayerUsd:ItemPriceHistory = {
    prices: tcgApiPriceHistory.map<ItemPriceHistoryPoint>(histPrice => mapTcgPlayerToDataPoint(
      histPrice,
      item,
      createConverter(usdExchanger)
    )),
    currencyCode: CurrencyCode.USD,
  }

  const cardmarketGbp:ItemPriceHistory = {
    prices: tcgApiPriceHistory.map<ItemPriceHistoryPoint>(histPrice => mapCardMarketToDataPoint(
      histPrice,
      item,
      createConverter(gbpExchanger)
    )),
    currencyCode: CurrencyCode.GBP,
  }
  const cardmarketUsd:ItemPriceHistory = {
    prices: tcgApiPriceHistory.map<ItemPriceHistoryPoint>(histPrice => mapCardMarketToDataPoint(
      histPrice,
      item,
      createConverter(usdExchanger)
    )),
    currencyCode: CurrencyCode.USD,
  }

  const itemPriceHistoryContainer:ItemPriceHistoryContainer = {
    fourteenDayGbpEbaySales,
    fourteenDayUsdEbaySales,
    ninetyDayGbpEbaySales,
    ninetyDayUsdEbaySales,
    tcgPlayerGbp,
    tcgPlayerUsd,
    cardmarketGbp,
    cardmarketUsd,
  }
  return itemPriceHistoryContainer
}

export const itemPriceHistoryCalculator = {
  calculateFull,
  mapHistoricalPriceEntity,
  mapCardMarketToDataPoint,
  mapTcgPlayerToDataPoint,
  createConverter,
}