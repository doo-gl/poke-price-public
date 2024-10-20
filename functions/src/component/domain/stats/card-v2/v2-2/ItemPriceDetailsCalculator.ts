import {CurrencyCode} from "../../../money/CurrencyCodes";
import {CardStatsEntityV2} from "../CardStatsEntityV2";
import {ItemEntity, ItemPriceDetails, ItemPrices, PriceType as ItemPriceType} from "../../../item/ItemEntity";
import {PriceType} from "../CardPriceSelectionEntity";
import {Price, statsPriceRetriever} from "../StatsPriceRetriever";
import {flattenArray} from "../../../../tools/ArrayFlattener";
import moment from "moment/moment";
import {currencyExchanger} from "../../../money/CurrencyExchanger";
import {dedupe} from "../../../../tools/ArrayDeduper";
import {statsCalculator} from "../StatsCalculator";
import {Moment} from "moment";
import {timestampToMoment} from "../../../../tools/TimeConverter";
import {fromCurrencyAmountLike} from "../../../money/CurrencyAmount";
import {historicalCardPriceRetriever} from "../../../historical-card-price/HistoricalCardPriceRetriever";
import {CardDataSource} from "../../../card/CardDataSource";
import {HistoricalCardPriceEntity} from "../../../historical-card-price/HistoricalCardPriceEntity";
import {CardCondition} from "../../../historical-card-price/CardCondition";
import {itemModificationPriceDetailsCalculator} from "./ItemModificationPriceDetailsCalculator";
import {sourcedItemPriceCalculator} from "./SourcedItemPriceCalculator";


export const statPriceTypeToItemPriceType = (statPriceType:PriceType):ItemPriceType => {
  switch (statPriceType) {
    case PriceType.LISTING_PRICE:
      return ItemPriceType.LISTING;
    case PriceType.SOLD_PRICE:
      return ItemPriceType.SALE
  }
}

const mapStatsToItemDetails = (statsEntity:CardStatsEntityV2):ItemPriceDetails => {
  const stats = statsEntity.stats
  const lowPrice = fromCurrencyAmountLike(stats.median).subtract(fromCurrencyAmountLike(stats.standardDeviation))
  const highPrice = fromCurrencyAmountLike(stats.median).add(fromCurrencyAmountLike(stats.standardDeviation))
  return {
    currencyCode: statsEntity.currencyCode,
    priceType: statPriceTypeToItemPriceType(statsEntity.priceType),
    modificationKey: null, // if we are using statsEntity.stats then these are unmodified stats
    currenciesUsed: [statsEntity.currencyCode],
    minPrice: stats.min,
    lowPrice: { amountInMinorUnits: Math.max(1, lowPrice.amountInMinorUnits), currencyCode: lowPrice.currencyCode },
    firstQuartile: stats.firstQuartile ?? null,
    price: stats.median,
    thirdQuartile: stats.thirdQuartile ?? null,
    highPrice: highPrice.toCurrencyAmountLike(),
    maxPrice: stats.max,
    mean: stats.mean,
    median: stats.median,
    stdDev: stats.standardDeviation,
    volume: stats.count,
    periodSizeDays: statsEntity.periodSizeDays,
    lastUpdatedAt: statsEntity.lastCalculatedAt.toDate(),
    mostRecentPrice: statsEntity.to.toDate(),
    statIds: [statsEntity.id],
  }
}

const calculateLatestStatsFromAggregate = (itemPriceStats:Array<CardStatsEntityV2>):{latestPrice:Moment|null, latestUpdate:Moment|null, periodSizeDays:number|null} => {
  let latestPrice:Moment|null = null;
  let latestUpdate:Moment|null = null;
  let periodSizeDays:number|null = null;
  itemPriceStats.forEach(itemStat => {
    const to = timestampToMoment(itemStat.to);
    const updatedAt = itemStat.lastCalculatedAt ? timestampToMoment(itemStat.lastCalculatedAt) : null
    if (!latestPrice || latestPrice.isBefore(to)) {
      latestPrice = to
    }
    if (!latestUpdate || (updatedAt && latestPrice.isBefore(updatedAt))) {
      latestUpdate = updatedAt;
    }
    if (!periodSizeDays || itemStat.periodSizeDays > periodSizeDays) {
      periodSizeDays = itemStat.periodSizeDays;
    }
  })
  return {latestPrice, latestUpdate, periodSizeDays}
}

const calculateTcgFallbackPrice = async (targetCurrency:CurrencyCode, cardId:string):Promise<ItemPriceDetails|null> => {
  const mostRecentTcgPlayerPrices = await historicalCardPriceRetriever.retrieveLastNPricesFromDataSource(
    cardId,
    CardDataSource.TCG_PLAYER,
    1,
  );
  if (!mostRecentTcgPlayerPrices || mostRecentTcgPlayerPrices.length === 0) {
    return null;
  }
  const mostRecentTcgPlayerPrice:HistoricalCardPriceEntity = mostRecentTcgPlayerPrices[0];
  const price = mostRecentTcgPlayerPrice.currencyAmount;
  const preferredCurrencyPrice = await currencyExchanger.exchange(price, targetCurrency, timestampToMoment(mostRecentTcgPlayerPrice.timestamp));
  return {
    currencyCode: targetCurrency,
    priceType: ItemPriceType.SALE,
    modificationKey: null,
    currenciesUsed: [price.currencyCode],
    minPrice: null,
    lowPrice: null,
    firstQuartile: null,
    price: preferredCurrencyPrice,
    thirdQuartile: null,
    highPrice: null,
    maxPrice: null,
    mean: null,
    median: null,
    stdDev: null,
    volume: null,
    periodSizeDays: null,
    lastUpdatedAt: null,
    mostRecentPrice: null,
    statIds: null,
  }
}

const convertPricesToTargetCurrency = async (targetCurrency:CurrencyCode, itemPriceStats:Array<CardStatsEntityV2>):Promise<Array<Price>> => {
  const pricesInOriginalCurrency = dedupe(
    flattenArray(
      await Promise.all(itemPriceStats.map(stat => statsPriceRetriever.retrievePricesByIds(stat)))
    ),
      i => i.id
  );

  const pricesInPreferredCurrency:Array<Price> = await Promise.all(pricesInOriginalCurrency.map(async price => {
    if (price.price.currencyCode === targetCurrency) {
      return price;
    }
    const timestamp = price.timestamp.isAfter(moment()) ? moment() : price.timestamp
    const currencyAmount = await currencyExchanger.exchange(price.price, targetCurrency, timestamp)
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

const calculateFallbackInMultipleCurrencies = async (
  item:ItemEntity,
  priceType:PriceType,
  targetCurrency:CurrencyCode,
  itemPriceStats:Array<CardStatsEntityV2>
):Promise<ItemPriceDetails|null> => {
  const matchingStats = itemPriceStats.filter(stats => stats.priceType === priceType && stats.stats.count > 0 && stats.condition === CardCondition.NEAR_MINT)
  if (matchingStats.length === 0) {
    return null
  }
  // find the entity that covers the largest time period for each currency
  // this is to ensure the fallback covers the most prices
  // also stops having duplicate stats used in the calculation
  // stats that cover a 14 day period are contained by the 90 day period stats
  const currencyCodeToLargestPeriodStats = new Map<CurrencyCode, CardStatsEntityV2>()
  matchingStats.forEach(stats => {
    const currencyCode = stats.currencyCode;
    const periodSizeDays = stats.periodSizeDays;
    const currentLargestPeriodStats = currencyCodeToLargestPeriodStats.get(currencyCode) ?? null;
    if (!currentLargestPeriodStats || currentLargestPeriodStats.periodSizeDays < periodSizeDays) {
      currencyCodeToLargestPeriodStats.set(currencyCode, stats)
    }
  })
  const statsToUseForFallback = [...currencyCodeToLargestPeriodStats.values()];
  const pricesInTargetCurrency = await convertPricesToTargetCurrency(targetCurrency, statsToUseForFallback);
  const fallbackStats = statsCalculator.calculate(targetCurrency, pricesInTargetCurrency.map(price => price.price));
  if (fallbackStats.count === 0) {
    return null;
  }
  const latestStatsFromFallback = calculateLatestStatsFromAggregate(statsToUseForFallback)
  const lowPrice = fromCurrencyAmountLike(fallbackStats.median).subtract(fromCurrencyAmountLike(fallbackStats.standardDeviation))
  const highPrice = fromCurrencyAmountLike(fallbackStats.median).add(fromCurrencyAmountLike(fallbackStats.standardDeviation))
  return {
    currencyCode: targetCurrency,
    priceType: statPriceTypeToItemPriceType(priceType),
    modificationKey: null,
    currenciesUsed: dedupe(statsToUseForFallback.map(stat => stat.currencyCode), i => i),
    minPrice: fallbackStats.min,
    lowPrice: { amountInMinorUnits: Math.max(1, lowPrice.amountInMinorUnits), currencyCode: lowPrice.currencyCode },
    firstQuartile: fallbackStats.firstQuartile ?? null,
    price: fallbackStats.median,
    thirdQuartile: fallbackStats.thirdQuartile ?? null,
    highPrice: highPrice.toCurrencyAmountLike(),
    maxPrice: fallbackStats.max,
    stdDev: fallbackStats.standardDeviation,
    mean: fallbackStats.mean,
    median: fallbackStats.median,
    volume: fallbackStats.count,
    periodSizeDays: latestStatsFromFallback.periodSizeDays,
    lastUpdatedAt: latestStatsFromFallback.latestUpdate?.toDate() ?? null,
    mostRecentPrice: latestStatsFromFallback.latestPrice?.toDate() ?? null,
    statIds: statsToUseForFallback.map(stat => stat.id),
  }
}

const calculateForPriceTypeAndCurrency = async (
  item:ItemEntity,
  priceType:PriceType,
  targetCurrency:CurrencyCode,
  itemPriceStats:Array<CardStatsEntityV2>
):Promise<Array<ItemPriceDetails>> => {
  if (itemPriceStats.length === 0) {
    return []
  }
  const matchingStats = itemPriceStats.filter(
    stats => stats.currencyCode === targetCurrency
      && stats.priceType === priceType
      && stats.condition === CardCondition.NEAR_MINT
      && stats.stats.count > 0
  )
  if (!matchingStats) {
    // if no stats match the price type and currency
    // see if there is a fallback that covers the price type in a different currency
    const fallbackStats = await calculateFallbackInMultipleCurrencies(item, priceType, targetCurrency, itemPriceStats)
    return fallbackStats ? [fallbackStats] : []
  }
  const itemPriceDetails = matchingStats.map(stats => mapStatsToItemDetails(stats))

  // fallback is need if there is no price details for this currency and price type that has more than 6 volume
  // implies that even at the largest time period there is not enough volume
  // so need to spread the net further to use more currencies
  const isFallbackRequired = itemPriceDetails.every(detail => (detail.volume ?? 0) < 6)
  if (isFallbackRequired) {
    const fallbackStats = await calculateFallbackInMultipleCurrencies(item, priceType, targetCurrency, itemPriceStats)
    if (fallbackStats) {
      itemPriceDetails.push(fallbackStats)
    }
  }

  return itemPriceDetails;
}

const calculateForCurrency = async (item:ItemEntity, targetCurrency:CurrencyCode, itemPriceStats:Array<CardStatsEntityV2>):Promise<Array<ItemPriceDetails>> => {
  const soldDetails = await calculateForPriceTypeAndCurrency(item, PriceType.SOLD_PRICE, targetCurrency, itemPriceStats);
  // if (soldDetails.length === 0 || soldDetails.every(detail => (detail.volume ?? 0) === 0)) {
  //   const tcgPlayerFallbackStats = await calculateTcgFallbackPrice(targetCurrency, item.legacyId ?? item._id.toString())
  //   if (tcgPlayerFallbackStats) {
  //     soldDetails = [tcgPlayerFallbackStats]
  //   }
  // }
  const listingDetails = await calculateForPriceTypeAndCurrency(item, PriceType.LISTING_PRICE, targetCurrency, itemPriceStats);
  return soldDetails.concat(listingDetails)
}

const calculate = async (item:ItemEntity, currencies:Array<CurrencyCode>, itemPriceStats:Array<CardStatsEntityV2>):Promise<ItemPrices> => {
  // only calculate item price details for near mint stats that have some volume
  const nearMintStats = itemPriceStats.filter(stat => stat.condition === CardCondition.NEAR_MINT && stat.stats.count > 0)
  const rawNearMintPrices = flattenArray(await Promise.all(
    currencies.map(currency => calculateForCurrency(item, currency, nearMintStats))
  ))

  const modificationPrices = itemModificationPriceDetailsCalculator.calculate(item, itemPriceStats);
  const sourcedPrices = await sourcedItemPriceCalculator.calculate(item, currencies)

  return {
    prices: rawNearMintPrices,
    modificationPrices,
    sourcedPrices,
  }
}

export const itemPriceDetailsCalculator = {
  calculate,
}