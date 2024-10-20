import {MongoEntity} from "../../../database/mongo/MongoEntity";
import {CurrencyAmountLike} from "../../money/CurrencyAmount";
import {mongoRepositoryFactory} from "../../../database/mongo/MongoRepositoryFactory";
import {UserEventEntity} from "../../user/event/UserEventEntity";


// calculate aggregate stats across ownerships / inventory / collections
// record every day
// use these to power statements like
// - you own more cards than 10% of users
// - your collection is more valuable than 30% of collections
// - that card is worth more than 90% of cards

// - that card is owned by 5% of users - this should be recorded on the item - leave til later

// eg. {percentile: 10.4, inventoryItemsOwned: 104}
// if you own 104 items you own more cards than 10.4% of users
export interface InventoryPercentile {
  percentile:number,
  inventoryItemsOwned:number,
  portfolioId:string,
}

export interface PortfolioValuePercentile {
  percentile:number,
  portfolioValue:CurrencyAmountLike
  portfolioId:string,
}

export interface ItemValuePercentile {
  percentile:number,
  itemValue:CurrencyAmountLike,
  itemId:string,
}

export interface AggregateCardOwnershipStats {
  totalInventoryItems:number,
  totalValueOfPortfolios:CurrencyAmountLike,
  totalNumberOfUniquePortfolios:number,
  inventoryOwnershipPercentiles:Array<InventoryPercentile>
  portfolioValuePercentiles:Array<PortfolioValuePercentile>
  itemValuePercentiles:Array<ItemValuePercentile>
}
export interface AggregateCardOwnershipStatsEntity extends MongoEntity, AggregateCardOwnershipStats {
  timestamp:Date,

}

const COLLECTION_NAME = 'aggregate.card.ownership.stats'

const result = mongoRepositoryFactory.build<AggregateCardOwnershipStatsEntity>(COLLECTION_NAME);
export const aggregateCardOwnershipStatsRepository = result.repository;
export const baseAggregateCardOwnershipStatsCreator = result.creator;
export const baseAggregateCardOwnershipStatsUpdater = result.updater;
export const baseAggregateCardOwnershipStatsDeleter = result.deleter;