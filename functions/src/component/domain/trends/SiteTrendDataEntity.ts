import {MongoEntity} from "../../database/mongo/MongoEntity";
import {mongoRepositoryFactory} from "../../database/mongo/MongoRepositoryFactory";
import {SiteTrendData} from "./SiteTrendCalculator";


export interface SiteTrendDataEntity extends MongoEntity {
  timestamp:Date,
  data:SiteTrendData
}

const COLLECTION_NAME = 'site.trend.data'

const result = mongoRepositoryFactory.build<SiteTrendDataEntity>(COLLECTION_NAME);
export const siteTrendDataRepository = result.repository;
export const baseSiteTrendDataCreator = result.creator;
export const baseSiteTrendDataUpdater = result.updater;
export const baseSiteTrendDataDeleter = result.deleter;