import {Entity} from "../../../database/Entity";
import {ItemPriceDetails} from "../ItemEntity";
import {Timestamp} from "../../../external-lib/Firebase";
import {repositoryFactory} from "../../../database/RepositoryFactory";

const COLLECTION_NAME = 'historical-item-price'

export interface HistoricalItemPriceEntity extends Entity, ItemPriceDetails {
  timestamp:Timestamp,
  itemId:string,
}

const result = repositoryFactory.build<HistoricalItemPriceEntity>(COLLECTION_NAME);
export const historicalItemPriceRepository = result.repository;
export const historicalItemPriceCreator = result.creator;
export const historicalItemPriceUpdater = result.updater;
export const historicalItemPriceDeleter = result.deleter;
