import {MongoEntity} from "../../../database/mongo/MongoEntity";
import {mongoRepositoryFactory} from "../../../database/mongo/MongoRepositoryFactory";


export interface UserEventEntity extends MongoEntity {
  userId:string,
  sessionId:string,
  timestamp:Date,
  path:string|null,
  eventName:string,
  eventDetails:{[key:string]:string|string[]|null},
}

const COLLECTION_NAME = 'user.event'

const result = mongoRepositoryFactory.build<UserEventEntity>(COLLECTION_NAME);
export const userEventRepository = result.repository;
export const baseUserEventCreator = result.creator;
export const baseUserEventUpdater = result.updater;
export const baseUserEventDeleter = result.deleter;