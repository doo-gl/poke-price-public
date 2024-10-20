import {CardStatsEntityV2} from "./CardStatsEntityV2";
import {NO_POKE_PRICE_INFO, PokePriceInfo} from "./CardPokePriceUpdater";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {PriceType} from "./CardPriceSelectionEntity";
import {CardCondition} from "../../historical-card-price/CardCondition";
import {comparatorBuilder} from "../../../infrastructure/ComparatorBuilder";
import {fromCurrencyAmountLike} from "../../money/CurrencyAmount";
import {timestampToMoment} from "../../../tools/TimeConverter";
import moment from "moment/moment";
import {currencyExchanger} from "../../money/CurrencyExchanger";
import {Moment} from "moment";
import {historicalCardPriceRetriever} from "../../historical-card-price/HistoricalCardPriceRetriever";
import {CardDataSource} from "../../card/CardDataSource";
import {HistoricalCardPriceEntity} from "../../historical-card-price/HistoricalCardPriceEntity";
import {flattenArray} from "../../../tools/ArrayFlattener";
import {Price, statsPriceRetriever} from "./StatsPriceRetriever";
import {toInputValueMap} from "../../../tools/MapBuilder";
import {statsCalculator} from "./StatsCalculator";
import {logger} from "firebase-functions";

export const BY_COUNT_DESC = comparatorBuilder.objectAttributeDESC<CardStatsEntityV2, number>(stats => stats.stats.count);

const MIN_DESIRED_COUNT = 6;

const mapStatsToInfo = async (cardStats:CardStatsEntityV2):Promise<PokePriceInfo> => {
  const lowPrice = fromCurrencyAmountLike(cardStats.stats.median).subtract(fromCurrencyAmountLike(cardStats.stats.standardDeviation))
  const highPrice = fromCurrencyAmountLike(cardStats.stats.median).add(fromCurrencyAmountLike(cardStats.stats.standardDeviation))
  return {
    minPrice: cardStats.stats.min,
    lowPrice: { amountInMinorUnits: Math.max(1, lowPrice.amountInMinorUnits), currencyCode: lowPrice.currencyCode },
    price: cardStats.stats.median,
    highPrice: highPrice.toCurrencyAmountLike(),
    maxPrice: cardStats.stats.max,
    volume: cardStats.stats.count,
    periodSizeDays: cardStats.periodSizeDays,
    lastUpdatedAt: cardStats.lastCalculatedAt ? timestampToMoment(cardStats.lastCalculatedAt) : null,
    mostRecentPrice: timestampToMoment(cardStats.to),
    statIds: [cardStats.id],
  }
}

const convertPricesToPreferredCurrency = async (preferredCurrency:CurrencyCode, cardStats:Array<CardStatsEntityV2>):Promise<Array<Price>> => {
  const pricesInOriginalCurrency = flattenArray(await Promise.all(cardStats.map(stat => statsPriceRetriever.retrievePricesByIds(stat))));
  const dedupedPricesInOriginalCurrency = [...toInputValueMap(pricesInOriginalCurrency, price => price.id).values()];

  const pricesInPreferredCurrency:Array<Price> = await Promise.all(dedupedPricesInOriginalCurrency.map(async price => {
    if (price.price.currencyCode === preferredCurrency) {
      return price;
    }
    const timestamp = price.timestamp.isAfter(moment()) ? moment() : price.timestamp
    const currencyAmount = await currencyExchanger.exchange(price.price, preferredCurrency, timestamp)
    return {
      id: price.id,
      timestamp: price.timestamp,
      selectionIds: price.selectionIds,
      price: currencyAmount,
      listing: price.listing,
      soldPrice: price.soldPrice,
      itemModification: price.itemModification,
    }
  }));
  return pricesInPreferredCurrency;
}

const combineStatsWithPreferredCurrencyPricesToInfo = (preferredCurrency:CurrencyCode, cardStats:Array<CardStatsEntityV2>, pricesInPreferredCurrency:Array<Price>):PokePriceInfo => {
  const stats = statsCalculator.calculate(
    preferredCurrency,
    pricesInPreferredCurrency.map(price => price.price)
  );

  let latestPrice:Moment|null = null;
  let latestUpdate:Moment|null = null;
  let periodSizeDays:number|null = null;
  const statIds:Array<string> = [];
  cardStats.forEach(cardStat => {
    statIds.push(cardStat.id)
    const to = timestampToMoment(cardStat.to);
    const updatedAt = cardStat.lastCalculatedAt ? timestampToMoment(cardStat.lastCalculatedAt) : null
    if (!latestPrice || latestPrice.isBefore(to)) {
      latestPrice = to
    }
    if (!latestUpdate || (updatedAt && latestPrice.isBefore(updatedAt))) {
      latestUpdate = updatedAt;
    }
    if (!periodSizeDays || cardStat.periodSizeDays > periodSizeDays) {
      periodSizeDays = cardStat.periodSizeDays;
    }
  })

  const lowPrice = fromCurrencyAmountLike(stats.median).subtract(fromCurrencyAmountLike(stats.standardDeviation))
  const highPrice = fromCurrencyAmountLike(stats.median).add(fromCurrencyAmountLike(stats.standardDeviation))
  return {
    minPrice: stats.min,
    lowPrice: { amountInMinorUnits: Math.max(1, lowPrice.amountInMinorUnits), currencyCode: lowPrice.currencyCode },
    price: stats.median,
    highPrice: highPrice.toCurrencyAmountLike(),
    maxPrice: stats.max,
    volume: stats.count,
    periodSizeDays,
    lastUpdatedAt: latestUpdate,
    mostRecentPrice: latestPrice,
    statIds: statIds,
  }
}

const combineStatsToInfo = async (preferredCurrency:CurrencyCode, cardStats:Array<CardStatsEntityV2>):Promise<PokePriceInfo> => {

  if (cardStats.length === 1 && cardStats[0].currencyCode === preferredCurrency) {
    return mapStatsToInfo(cardStats[0])
  }

  const pricesInPreferredCurrency:Array<Price> = await convertPricesToPreferredCurrency(preferredCurrency, cardStats)

  return combineStatsWithPreferredCurrencyPricesToInfo(preferredCurrency, cardStats, pricesInPreferredCurrency)
}

const countItems = (cardStats:Array<CardStatsEntityV2>):number => {
  const ids = new Set<string>();
  cardStats.forEach(cardStat => {
    cardStat.itemIds.forEach(itemId => {
      ids.add(itemId)
    })
  })
  return ids.size;
}

const calculateTcgFallbackPrice = async (preferredCurrency:CurrencyCode, cardId:string):Promise<PokePriceInfo> => {
  const mostRecentTcgPlayerPrices = await historicalCardPriceRetriever.retrieveLastNPricesFromDataSource(
    cardId,
    CardDataSource.TCG_PLAYER,
    1,
  );
  if (!mostRecentTcgPlayerPrices || mostRecentTcgPlayerPrices.length === 0) {
    return NO_POKE_PRICE_INFO;
  }
  const mostRecentTcgPlayerPrice:HistoricalCardPriceEntity = mostRecentTcgPlayerPrices[0];
  const price = mostRecentTcgPlayerPrice.currencyAmount;
  const preferredCurrencyPrice = await currencyExchanger.exchange(price, preferredCurrency, timestampToMoment(mostRecentTcgPlayerPrice.timestamp));
  return {
    minPrice: null,
    lowPrice: null,
    price: preferredCurrencyPrice,
    highPrice: null,
    maxPrice: null,
    volume: null,
    periodSizeDays: null,
    lastUpdatedAt: null,
    mostRecentPrice: null,
    statIds: null,
  }
}

const attemptToFindMinDesiredStats = async (
  cardStats:Array<CardStatsEntityV2>,
  preferredCurrency:CurrencyCode,
  inPreferredCurrency:boolean,
  maxPeriodSize:number,
  minDesiredCount:number
):Promise<PokePriceInfo|null> => {

  const filteredStats = cardStats.filter(cardStat =>
    cardStat.priceType === PriceType.SOLD_PRICE
    && cardStat.condition === CardCondition.NEAR_MINT
    && cardStat.periodSizeDays < maxPeriodSize
    && (!inPreferredCurrency || cardStat.currencyCode === preferredCurrency)
  )
  const count = countItems(filteredStats)
  if (count <= minDesiredCount) {
    return null
  }
  return await combineStatsToInfo(preferredCurrency, filteredStats)
}

const calculate = async (cardId:string, preferredCurrency:CurrencyCode, cardStats:Array<CardStatsEntityV2>):Promise<PokePriceInfo> => {
  if (cardStats.length === 0) {
    const fallback = await calculateTcgFallbackPrice(preferredCurrency, cardId);
    logger.info(`Fell back to using tcg pricing, for card: ${cardId}`)
    return fallback
  }

  const narrowTimeframeNearMintInPreferredCurrency = await attemptToFindMinDesiredStats(
    cardStats,
    preferredCurrency,
    true,
    20,
    MIN_DESIRED_COUNT
  )
  if (narrowTimeframeNearMintInPreferredCurrency) {
    return narrowTimeframeNearMintInPreferredCurrency
  }
  logger.info(`No narrow time frame, near mint, preferred currency stats, falling back, for card: ${cardStats[0].cardId}`)

  const wideTimeframeNearMintInPreferredCurrency = await attemptToFindMinDesiredStats(
    cardStats,
    preferredCurrency,
    true,
    100,
    MIN_DESIRED_COUNT
  )
  if (wideTimeframeNearMintInPreferredCurrency) {
    return wideTimeframeNearMintInPreferredCurrency
  }
  logger.info(`No wide time frame, near mint, preferred currency stats, falling back, for card: ${cardStats[0].cardId}`)

  const wideTimeframeNearMintInAnyCurrency = await attemptToFindMinDesiredStats(
    cardStats,
    preferredCurrency,
    false,
    100,
    0,
  )
  if (wideTimeframeNearMintInAnyCurrency) {
    return wideTimeframeNearMintInAnyCurrency
  }
  logger.info(`No wide time frame, near mint, any currency stats, falling back, for card: ${cardStats[0].cardId}`)

  const tcgPrice = await calculateTcgFallbackPrice(preferredCurrency, cardStats[0].cardId);
  logger.info(`Fell back to using tcg pricing, for card: ${cardStats[0].cardId}`)
  return tcgPrice
}

export const cardPokePriceSoldCalculator = {
  calculate,
  mapStatsToInfo,
  combineStatsToInfo,
  combineStatsWithPreferredCurrencyPricesToInfo,
}