import {CurrencyCode} from "../../money/CurrencyCodes";
import {CurrencyAmountLike} from "../../money/CurrencyAmount";
import {PriceSource} from "../../item/ItemEntity";

export interface PublicHistoricalStat {
  timestamp:string,
  inventoryCount:number,
  inventoryTotalValue:CurrencyAmountLike,
  inventoryTotalAmountPaid:CurrencyAmountLike,
  inventoryTotalProfit:CurrencyAmountLike,
  inventoryWithAmountPaid:number,
  collectionsStarted:number,
  collectionsCompleted:number,
  collectionCompletionPercentage:number,
}

export interface PublicHistoricalStats {
  stats:Array<PublicHistoricalStat>
}

export interface PublicOwnedCollectionStats {
  collectionId:string,
  totalNumberOfOwnedItems:number,
  totalNumberOfItems:number,
  collectionCompletionPercentage:number,
  totalValueOfOwnedItems:CurrencyAmountLike,
  totalValueOfItems:CurrencyAmountLike,
  collectionValueCompletionPercentage:number,
}

export interface PublicOwnedItemStats {
  itemId:string,
  amount:CurrencyAmountLike
}

export interface PublicOwnedInventoryItemStats {
  inventoryItemId:string,
  itemId:string,
  amountPaid:CurrencyAmountLike|null,
  value:CurrencyAmountLike,
  profit:CurrencyAmountLike|null,
  priceSource?:PriceSource,
  modificationKey?:string|null,
}

export interface PublicCurrentPortfolioStats {
  totalNumberOfInventoryItems:number,
  totalNumberOfInventoryItemsWithAmountPaid:number,
  totalValueOfInventoryItems:CurrencyAmountLike,
  totalAmountPaidForInventoryItems:CurrencyAmountLike,
  totalProfitOnAmountPaidForInventoryItems:CurrencyAmountLike,

  totalCollectionsStarted:number,
  totalCollectionsCompleted:number,
  totalCollectionCompletionPercentage:number,



  topCollections:Array<PublicOwnedCollectionStats>
  topItems:Array<PublicOwnedItemStats>
  topInventoryItems:Array<PublicOwnedInventoryItemStats>

}

export interface PublicPortfolioStatsDto {
  currencyCode:CurrencyCode
  currentStats:PublicCurrentPortfolioStats,
  historicalStats:PublicHistoricalStats
}

export interface PublicPortfolioDto {
  username:string|null,
  stats:PublicPortfolioStatsDto|null,
  visible:boolean,
}