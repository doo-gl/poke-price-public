import {MongoEntity} from "../../../database/mongo/MongoEntity";
import {mongoRepositoryFactory} from "../../../database/mongo/MongoRepositoryFactory";


export interface FavouriteCollectionEntity extends MongoEntity {
  collectionId:string,
  userId:string,
}

const COLLECTION_NAME = 'favourite.collection'

const result = mongoRepositoryFactory.build<FavouriteCollectionEntity>(COLLECTION_NAME);
export const favouriteCollectionRepository = result.repository;
export const baseFavouriteCollectionCreator = result.creator;
export const baseFavouriteCollectionUpdater = result.updater;
export const baseFavouriteCollectionDeleter = result.deleter;