import {
  HistoricalStat,
  HistoricalStats,
  InventoryItemStats,
  OwnedCollectionStats,
  PortfolioStats,
} from "./PortfolioStatsEntity";
import {PortfolioStatsHistoryEntity} from "./PortfolioStatsHistoryEntity";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {momentToString, momentToTimestamp, stringToMoment, timestampToMoment} from "../../tools/TimeConverter";
import {groupByDay} from "../../tools/GroupByDay";
import {portfolioStatsHistoryRetriever} from "./PortfolioStatsHistoryRetriever";
import {Timestamp} from "../../external-lib/Firebase";
import {StatCalculationContext} from "./StatCalculationContext";
import moment from "moment";
import {CurrencyCode} from "../money/CurrencyCodes";
import {Zero} from "../money/CurrencyAmount";

export const emptyHistoricalStat = (timestamp:string, currencyCode:CurrencyCode):HistoricalStat => {
  const zero = Zero(currencyCode).toCurrencyAmountLike()
  return {
    timestamp,
    inventoryCount: 0,
    inventoryTotalValue: zero,
    inventoryTotalProfit: zero,
    inventoryTotalAmountPaid: zero,
    inventoryWithAmountPaid: 0,
    collectionsStarted: 0,
    collectionsCompleted: 0,
    collectionCompletionPercentage: 0,
  }
}

const mapHistoricalStat = (
  timestamp:Timestamp,
  inventoryItemStats:InventoryItemStats,
  collectionStats:OwnedCollectionStats,
):HistoricalStat => {
  // these didn't exist in the earliest versions of the portfolio so we use them if they are there, else we recalculate them
  const collectionsStarted = collectionStats.totalCollectionsStarted ?? collectionStats.collectionStats.filter(col => col.totalNumberOfOwnedItems > 0).length;
  const collectionsCompleted = collectionStats.totalCollectionsCompleted ?? collectionStats.collectionStats.filter(col => col.totalNumberOfOwnedItems === col.totalNumberOfItems).length;

  return {
    timestamp: timestampToMoment(timestamp).toISOString(),
    inventoryCount: inventoryItemStats.totalNumberOfIndividualItems,
    inventoryTotalAmountPaid: {...inventoryItemStats.totalAmountPaid},
    inventoryTotalProfit: {...inventoryItemStats.totalProfitFromAmountPaid},
    inventoryTotalValue: {...inventoryItemStats.totalValueOfInventoryItems},
    inventoryWithAmountPaid: inventoryItemStats.totalNumberOfIndividualItemsWithAmountPaid,
    collectionsStarted,
    collectionsCompleted,
    collectionCompletionPercentage: collectionStats.totalCollectionCompletionPercentage,
  }
}

const mapHistoricalStats = (history:Array<PortfolioStatsHistoryEntity>):HistoricalStats => {
  const stats:Array<HistoricalStat> = []
  groupByDay(
    history.slice(),
    val => timestampToMoment(val.timestamp)
  )
    .sort(comparatorBuilder.combineAll(
      comparatorBuilder.objectAttributeASC(val => val.timestamp.toDate().getTime()),
      comparatorBuilder.objectAttributeASC(val => val.id)
    ))
    .forEach((hist:PortfolioStatsHistoryEntity, index:number) => {
      if (index === 0) {
        stats.push(emptyHistoricalStat(
          momentToString(timestampToMoment(hist.timestamp).subtract('1', 'day').startOf('day')),
          hist.currencyCode,
        ))
      }

      stats.push(mapHistoricalStat(
        hist.timestamp,
        hist.inventoryItemStats,
        hist.collectionStats
      ))
    })
  return {
    stats,
  }
}

const retrieveHistoryForPortfolio = async (portfolioStatsId:string):Promise<Array<PortfolioStatsHistoryEntity>> => {
  return portfolioStatsHistoryRetriever.retrieveByPortfolioId(portfolioStatsId)
}

const calculate = (context:StatCalculationContext):HistoricalStats => {
  const portfolio = context.getPortfolio()
  if (!portfolio) {
    return { stats: [] }
  }
  const history = context.getHistory()
  const historicalStats = mapHistoricalStats(history)
  return historicalStats
}

const onInventoryStatsUpdate = (
  newInventoryStats:InventoryItemStats,
  newCollectionStats:OwnedCollectionStats,
  previousPortfolioStats:PortfolioStats
):HistoricalStats => {
  const previousHistoricalStats = previousPortfolioStats.historicalStats
  if (!previousHistoricalStats || !previousHistoricalStats.stats) {
    return {stats: []}
  }

  const mostRecentHistoryStat:HistoricalStat|null = previousHistoricalStats && previousHistoricalStats.stats && previousHistoricalStats.stats.length > 0
    ? previousHistoricalStats.stats[previousHistoricalStats.stats.length - 1]
    : null
  const mostRecentHistoryTimestamp = mostRecentHistoryStat
    ? stringToMoment(mostRecentHistoryStat.timestamp).utc()
    : moment().utc()
  if (!mostRecentHistoryStat) {
    return {
      stats: [
        emptyHistoricalStat(
          momentToString(mostRecentHistoryTimestamp.clone().subtract('1', 'day').startOf('day')),
          previousPortfolioStats.currencyCode,
        ),
        mapHistoricalStat(
          momentToTimestamp(mostRecentHistoryTimestamp),
          newInventoryStats,
          newCollectionStats,
        ),
      ],
    }
  }

  const isMostRecentTimestampToday = mostRecentHistoryTimestamp.isAfter(moment().startOf('day'))
  if (isMostRecentTimestampToday) {
    const newMostRecentHistoryStats:HistoricalStat = mapHistoricalStat(
      momentToTimestamp(mostRecentHistoryTimestamp),
      newInventoryStats,
      newCollectionStats,
    )
    previousHistoricalStats.stats[previousHistoricalStats.stats.length - 1] = newMostRecentHistoryStats
  } else {
    const newMostRecentHistoryStats:HistoricalStat = mapHistoricalStat(
      momentToTimestamp(moment()),
      newInventoryStats,
      newCollectionStats,
    )
    previousHistoricalStats.stats.push(newMostRecentHistoryStats)
  }

  return previousHistoricalStats
}


const onInventoryItemsAdded = (
  newInventoryStats:InventoryItemStats,
  newCollectionStats:OwnedCollectionStats,
  previousPortfolioStats:PortfolioStats
):HistoricalStats => {
  return onInventoryStatsUpdate(
    newInventoryStats,
    newCollectionStats,
    previousPortfolioStats
  )
}

const onInventoryItemsRemoved = (
  newInventoryStats:InventoryItemStats,
  newCollectionStats:OwnedCollectionStats,
  previousPortfolioStats:PortfolioStats
):HistoricalStats => {
  return onInventoryStatsUpdate(
    newInventoryStats,
    newCollectionStats,
    previousPortfolioStats
  )
}



export const historicalStatsCalculator = {
  calculate,
  onInventoryItemsAdded,
  onInventoryItemsRemoved,
  mapHistoricalStat,
}