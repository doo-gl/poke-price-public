import {ItemEntity, ItemPriceDetails} from "../../../item/ItemEntity";
import {CardStatsEntityV2} from "../CardStatsEntityV2";
import {comparatorBuilder} from "../../../../infrastructure/ComparatorBuilder";
import {statPriceTypeToItemPriceType} from "./ItemPriceDetailsCalculator";
import {toInputValueMultiMap} from "../../../../tools/MapBuilder";
import {CardCondition} from "../../../historical-card-price/CardCondition";
import {fromCurrencyAmountLike} from "../../../money/CurrencyAmount";
import {flattenArray} from "../../../../tools/ArrayFlattener";


const chooseLongestPeriodStats = (itemPriceStats:Array<CardStatsEntityV2>):Array<CardStatsEntityV2> => {
  const keyToGroup = toInputValueMultiMap(
    itemPriceStats.filter(stat => stat.condition === CardCondition.NEAR_MINT),
      val => `${val.priceType}|${val.currencyCode}`
  )
  const results = new Array<CardStatsEntityV2>()

  keyToGroup.forEach(group => {
    if (group.length === 0) {
      return
    }
    const sortedGroup = group.slice().sort(comparatorBuilder.objectAttributeDESC(val => val.periodSizeDays))
    results.push(sortedGroup[0])
  })

  return results
}

const mapToDetails = (stats:CardStatsEntityV2):Array<ItemPriceDetails> => {
  const modificationStats = stats.modificationStats ?? []
  return modificationStats
    .filter(modStat => modStat.stats.count > 0)
    .map(modStat => {
      const lowPrice = fromCurrencyAmountLike(modStat.stats.median).subtract(fromCurrencyAmountLike(modStat.stats.standardDeviation))
      const highPrice = fromCurrencyAmountLike(modStat.stats.median).add(fromCurrencyAmountLike(modStat.stats.standardDeviation))
      return {
        currencyCode: stats.currencyCode,
        priceType: statPriceTypeToItemPriceType(stats.priceType),
        modificationKey: modStat.modificationKey,
        currenciesUsed: [stats.currencyCode],
        statIds: [stats.id],
        periodSizeDays: stats.periodSizeDays,
        lastUpdatedAt: stats.lastCalculatedAt.toDate(),
        mostRecentPrice: modStat.to.toDate(),
        minPrice: modStat.stats.min,
        lowPrice: lowPrice.toCurrencyAmountLike(),
        firstQuartile: modStat.stats.firstQuartile ?? null,
        median: modStat.stats.median,
        price: modStat.stats.median,
        mean: modStat.stats.mean,
        thirdQuartile: modStat.stats.thirdQuartile ?? null,
        highPrice: highPrice.toCurrencyAmountLike(),
        maxPrice: modStat.stats.max,
        stdDev: modStat.stats.standardDeviation,
        volume: modStat.stats.count,
      }
    })
}

const calculate = (item:ItemEntity, itemPriceStats:Array<CardStatsEntityV2>):Array<ItemPriceDetails> => {
  // For modification prices, we find the longest period stats entity for each currency <==> price type pair
  // then go through each of these stats entities extracting their item modification stats
  // provided there is some volume, we add them to the mod prices
  // mod prices for different mods will appear and disappear as individual sales fall out of the time frame.
  // mod prices behave more like a sparse array of prices for the different mods.

  const longestPeriodStats = chooseLongestPeriodStats(itemPriceStats)
  const details = longestPeriodStats.map(stat => mapToDetails(stat))
  return flattenArray(details)
}

export const itemModificationPriceDetailsCalculator = {
  calculate,
}