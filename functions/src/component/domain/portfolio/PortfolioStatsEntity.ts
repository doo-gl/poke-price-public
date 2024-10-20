import {Entity} from "../../database/Entity";
import {CurrencyAmountLike} from "../money/CurrencyAmount";
import {repositoryFactory} from "../../database/RepositoryFactory";
import {Timestamp} from "../../external-lib/Firebase";
import {CurrencyCode} from "../money/CurrencyCodes";
import {PriceSource} from "../item/ItemEntity";

const COLLECTION_NAME = 'portfolio-stats'

export interface TopItem {
  itemId:string,
  amount:CurrencyAmountLike
}

export interface OwnedItemStats {
  totalNumberOfOwnedItems:number,
  totalValueOfOwnedItems:CurrencyAmountLike,
  mostValuableOwnedItems:Array<TopItem>
  mostValuableOwnedItemsIds:Array<string>,
}

export interface OwnedCollectionStats {
  collectionStats:Array<SingleCollectionStats>
  topCollections:Array<TopCollection>
  topCollectionIds:Array<string>,
  totalCollectionItemsOwned:number,
  totalCollectionItems:number,
  totalCollectionCompletionPercentage:number,
  totalCollectionsStarted:number,
  totalCollectionsCompleted:number,

  /**
   * @deprecated
   */
  totalUniqueItemsOwnedInStartedCollections:number,
  /**
   * @deprecated
   */
  totalUniqueItemsNeededInStartedCollections:number,
  /**
   * @deprecated
   */
  totalUniqueItemsInStartedCollections:number,
}

export interface SingleCollectionStats {
  collectionId:string,
  totalNumberOfOwnedItems:number,
  totalNumberOfItems:number,
  collectionCompletionPercentage:number,
  totalValueOfOwnedItems:CurrencyAmountLike,
  totalValueOfItems:CurrencyAmountLike,
  collectionValueCompletionPercentage:number,
}

export interface TopCollection {
  collectionId:string,
  collectionCompletionPercentage:number,
  collectionValueCompletionPercentage:number,
  totalValueOfOwnedItems:CurrencyAmountLike,
}

export interface TopInventoryItem {
  inventoryItemId:string,
  itemId:string,
  amountPaid:CurrencyAmountLike|null,
  value:CurrencyAmountLike,
  profit:CurrencyAmountLike|null,
  priceSource?:PriceSource,
  modificationKey?:string|null,
}

export interface InventoryItemGroupStats {
  groupingKey:string,
  group:{[key:string]:string},
  stats:InventoryItemStats,
}

export interface InventoryItemStats {
  totalNumberOfIndividualItems:number,
  totalNumberOfIndividualItemsWithAmountPaid:number,
  totalValueOfInventoryItems:CurrencyAmountLike,
  totalProfitFromAmountPaid:CurrencyAmountLike,
  totalAmountPaid:CurrencyAmountLike,
  topInventoryItems:Array<TopInventoryItem>,
  topInventoryItemIds:Array<string>,
}

export interface HistoricalStats {
  stats:Array<HistoricalStat>
}

export interface HistoricalStat {
  timestamp:string,
  inventoryCount:number,
  inventoryTotalValue:CurrencyAmountLike,
  inventoryTotalAmountPaid:CurrencyAmountLike,
  inventoryWithAmountPaid:number,
  inventoryTotalProfit:CurrencyAmountLike,
  collectionsStarted:number,
  collectionsCompleted:number,
  collectionCompletionPercentage:number,

}

export interface PortfolioStats {
  userId:string,
  currencyCode:CurrencyCode
  ownedItemStats:OwnedItemStats,
  collectionStats:OwnedCollectionStats,
  inventoryItemStats:InventoryItemStats,
  historicalStats:HistoricalStats
}

export interface PortfolioStatsEntity extends Entity, PortfolioStats {
  lastUpdate:Timestamp|null,
  nextUpdate:Timestamp|null,
  recalculationTimeoutTimestamp:Timestamp|null,
  isPublic?:boolean,
}



const result = repositoryFactory.build<PortfolioStatsEntity>(COLLECTION_NAME);
export const portfolioStatsRepository = result.repository;
export const portfolioStatsCreator = result.creator;
export const portfolioStatsUpdater = result.updater;
export const portfolioStatsDeleter = result.deleter;