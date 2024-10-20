import {PortfolioStats, PortfolioStatsEntity} from "./PortfolioStatsEntity";
import {statCalculationContextBuilder} from "./StatCalculationContextBuilder";
import {CurrencyCode} from "../money/CurrencyCodes";
import {ownedItemStatsCalculator} from "./OwnedItemStatsCalculator";
import {inventoryItemStatsCalculator} from "./InventoryItemStatsCalculator";
import {Zero} from "../money/CurrencyAmount";
import {historicalStatsCalculator} from "./HistoricalStatsCalculator";
import {collectionStatsCalculator} from "./stats/CollectionStatsCalculator";
import {StatCalculationContext} from "./StatCalculationContext";


const calculate = async (userId:string, preExistingPortfolio:PortfolioStatsEntity|null):Promise<PortfolioStats> => {

  const context = await statCalculationContextBuilder.build(userId, preExistingPortfolio);
  const ownedItemStats = ownedItemStatsCalculator.calculate(context)
  const collectionStats = collectionStatsCalculator.calculate(context)
  const inventoryItemStats = inventoryItemStatsCalculator.calculate(context)
  const historicalStats = historicalStatsCalculator.calculate(context)

  return {
    userId,
    currencyCode: context.getUserCurrencyCode(),
    ownedItemStats,
    collectionStats,
    inventoryItemStats,
    historicalStats,
  }
}

const onInventoryItemsAddedV2 = (currentPortfolio:PortfolioStatsEntity, context:StatCalculationContext):PortfolioStats => {

  const newInventory = context.getAllInventoryItemsWithStats()
  const newOwnerships = context.getOwnershipItemStats()
  const updatedCollections = context.getCollections()

  const newInventoryStats = inventoryItemStatsCalculator.onItemsAdded(
    newInventory,
    currentPortfolio.inventoryItemStats,
  );
  const newCollectionStats = collectionStatsCalculator.onOwnedItemsAdded(
    currentPortfolio.collectionStats,
    newOwnerships,
    updatedCollections
  );
  const newOwnedItemStats = ownedItemStatsCalculator.onItemsAdded(
    newOwnerships,
    currentPortfolio.ownedItemStats
  );
  const newHistoricalStats = historicalStatsCalculator.onInventoryItemsAdded(
    newInventoryStats,
    newCollectionStats,
    currentPortfolio
  );

  return {
    userId: currentPortfolio.userId,
    currencyCode: currentPortfolio.currencyCode,
    inventoryItemStats: newInventoryStats,
    collectionStats: newCollectionStats,
    ownedItemStats: newOwnedItemStats,
    historicalStats: newHistoricalStats,
  }
}

const onInventoryItemsRemovedV2 = (currentPortfolio:PortfolioStatsEntity, context:StatCalculationContext):PortfolioStats => {

  const removedInventory = context.getAllInventoryItemsWithStats()
  const removedOwnerships = context.getOwnershipItemStats()
  const updatedCollections = context.getCollections()

  const newInventoryStats = inventoryItemStatsCalculator.onItemsRemoved(
    removedInventory,
    currentPortfolio.inventoryItemStats,
  );
  const newCollectionStats = collectionStatsCalculator.onOwnedItemsRemoved(
    currentPortfolio.collectionStats,
    removedOwnerships,
    updatedCollections
  );
  const newOwnedItemStats = ownedItemStatsCalculator.onItemsRemoved(
    removedOwnerships,
    currentPortfolio.ownedItemStats
  );
  const newHistoricalStats = historicalStatsCalculator.onInventoryItemsRemoved(
    newInventoryStats,
    newCollectionStats,
    currentPortfolio
  );

  return {
    userId: currentPortfolio.userId,
    currencyCode: currentPortfolio.currencyCode,
    inventoryItemStats: newInventoryStats,
    collectionStats: newCollectionStats,
    ownedItemStats: newOwnedItemStats,
    historicalStats: newHistoricalStats,
  }
}

const emptyStats = (userId:string, currencyCode:CurrencyCode):PortfolioStats => {
  return {
    userId,
    currencyCode,
    ownedItemStats: {
      totalValueOfOwnedItems: Zero(currencyCode).toCurrencyAmountLike(),
      totalNumberOfOwnedItems: 0,
      mostValuableOwnedItemsIds: [],
      mostValuableOwnedItems: [],
    },
    inventoryItemStats: {
      totalNumberOfIndividualItems: 0,
      totalNumberOfIndividualItemsWithAmountPaid: 0,
      totalProfitFromAmountPaid: Zero(currencyCode).toCurrencyAmountLike(),
      totalValueOfInventoryItems: Zero(currencyCode).toCurrencyAmountLike(),
      totalAmountPaid: Zero(currencyCode).toCurrencyAmountLike(),
      topInventoryItems: [],
      topInventoryItemIds: [],
    },
    collectionStats: {
      collectionStats: [],
      topCollectionIds: [],
      topCollections: [],
      totalCollectionCompletionPercentage: 0,
      totalCollectionItems: 0,
      totalCollectionItemsOwned: 0,
      totalCollectionsStarted: 0,
      totalCollectionsCompleted: 0,
      totalUniqueItemsInStartedCollections: 0,
      totalUniqueItemsNeededInStartedCollections: 0,
      totalUniqueItemsOwnedInStartedCollections: 0,
    },
    historicalStats: {
      stats: [],
    },
  }
}

export const portfolioStatsCalculator = {
  calculate,
  onInventoryItemsAddedV2,
  onInventoryItemsRemovedV2,
  emptyStats,
}