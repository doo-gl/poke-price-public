import {PortfolioStatsEntity} from "../PortfolioStatsEntity";
import {
  PublicCurrentPortfolioStats,
  PublicHistoricalStats,
  PublicPortfolioDto,
  PublicPortfolioStatsDto,
} from "./PublicPortfolioDto";
import {UserEntity} from "../../user/UserEntity";
import {toInputValueMap} from "../../../tools/MapBuilder";
import {removeNulls} from "../../../tools/ArrayNullRemover";

const mapCurrentStats = (portfolio:PortfolioStatsEntity):PublicCurrentPortfolioStats => {

  const ownedItemStats = portfolio.ownedItemStats
  const inventoryStats = portfolio.inventoryItemStats
  const collectionStats = portfolio.collectionStats
  const collectionIdToCollection = toInputValueMap(collectionStats.collectionStats, col => col.collectionId)

  return {
    totalNumberOfInventoryItems: inventoryStats.totalNumberOfIndividualItems,
    totalNumberOfInventoryItemsWithAmountPaid: inventoryStats.totalNumberOfIndividualItemsWithAmountPaid,
    totalValueOfInventoryItems: inventoryStats.totalValueOfInventoryItems,
    totalAmountPaidForInventoryItems: inventoryStats.totalAmountPaid,
    totalProfitOnAmountPaidForInventoryItems: inventoryStats.totalProfitFromAmountPaid,

    totalCollectionsStarted: collectionStats.totalCollectionsStarted,
    totalCollectionsCompleted: collectionStats.totalCollectionsCompleted,
    totalCollectionCompletionPercentage: collectionStats.totalCollectionCompletionPercentage,

    topCollections: removeNulls(collectionStats.topCollections.map(col => {
      const collection = collectionIdToCollection.get(col.collectionId) ?? null
      if (!collection) {
        return null
      }
      return {
        collectionId: col.collectionId,
        collectionCompletionPercentage: col.collectionCompletionPercentage,
        totalValueOfOwnedItems: col.totalValueOfOwnedItems,
        collectionValueCompletionPercentage: col.collectionValueCompletionPercentage,
        totalNumberOfOwnedItems: collection.totalNumberOfOwnedItems,
        totalNumberOfItems: collection.totalNumberOfItems,
        totalValueOfItems: collection.totalValueOfItems,
      }
    })),
    topItems: ownedItemStats.mostValuableOwnedItems,
    topInventoryItems: inventoryStats.topInventoryItems.map(inv => ({
      itemId: inv.itemId,
      inventoryItemId: inv.inventoryItemId,
      profit: inv.profit,
      value: inv.value,
      amountPaid: inv.amountPaid,
    })),
  }
}

const mapHistoricalStats = (portfolio:PortfolioStatsEntity):PublicHistoricalStats => {
  const currencyCode = portfolio.currencyCode
  return {
    stats: portfolio.historicalStats.stats
      .filter(stat => stat.inventoryTotalValue.currencyCode === currencyCode)
      .map(stat => ({
        timestamp: stat.timestamp,
        inventoryCount: stat.inventoryCount,
        inventoryTotalAmountPaid: stat.inventoryTotalAmountPaid,
        inventoryTotalProfit: stat.inventoryTotalProfit,
        inventoryTotalValue: stat.inventoryTotalValue,
        inventoryWithAmountPaid: stat.inventoryWithAmountPaid,
        collectionsStarted: stat.collectionsStarted,
        collectionsCompleted: stat.collectionsCompleted,
        collectionCompletionPercentage: stat.collectionCompletionPercentage,
      })),
  }
}

const mapStats = (portfolio:PortfolioStatsEntity):PublicPortfolioStatsDto => {

  return {
    currencyCode: portfolio.currencyCode,
    currentStats: mapCurrentStats(portfolio),
    historicalStats: mapHistoricalStats(portfolio),
  }
}

const mapPublic = (user:UserEntity, portfolio:PortfolioStatsEntity):PublicPortfolioDto => {

  return {
    username: user.details?.username ?? null,
    stats: mapStats(portfolio),
    visible: portfolio.isPublic === undefined || portfolio.isPublic,
  }
}

export const publicPortfolioMapper = {
  mapPublic,
}