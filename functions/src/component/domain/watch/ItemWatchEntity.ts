import {Entity} from "../../database/Entity";
import {repositoryFactory} from "../../database/RepositoryFactory";

const COLLECTION_NAME = 'item-watch'

export enum ItemWatchState {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface ItemWatchEntity extends Entity {
  itemId:string,
  userId:string,
  state:ItemWatchState,
}


const result = repositoryFactory.build<ItemWatchEntity>(COLLECTION_NAME);
export const itemWatchRepository = result.repository;
export const itemWatchCreator = result.creator;
export const itemWatchUpdater = result.updater;
export const itemWatchDeleter = result.deleter;