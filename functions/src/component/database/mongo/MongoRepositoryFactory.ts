
import {EntityCreator, mongoEntityCreatorFactory} from "./MongoEntityCreatorFactory";
import {EntityUpdater, mongoEntityUpdaterFactory} from "./MongoEntityUpdaterFactory";
import {EntityDeleter, mongoEntityDeleterFactory} from "./MongoEntityDeleterFactory";
import {MongoEntity} from "./MongoEntity";
import {MongoBaseCrudRepository} from "./MongoBaseCrudRepository";
import {databaseStatsLogger} from "../../infrastructure/express/DatabaseStatsLogger";
import {mongoConnectionManager} from "./MongoConnectionManager";

export interface RepositoryResult<T extends MongoEntity> {
  repository:MongoBaseCrudRepository<T>,
  creator:EntityCreator<T>,
  updater:EntityUpdater<T>,
  deleter:EntityDeleter<T>,
}

const build = <T extends MongoEntity>(collectionName:string):RepositoryResult<T> => {
  const repository = new MongoBaseCrudRepository<T>(
    mongoConnectionManager,
    collectionName,
    stats => databaseStatsLogger.log(stats)
  );
  const creator = mongoEntityCreatorFactory.build(repository);
  const updater = mongoEntityUpdaterFactory.build(repository);
  const deleter = mongoEntityDeleterFactory.build(repository);
  return {
    repository,
    creator,
    updater,
    deleter,
  }
}

export const mongoRepositoryFactory = {
  build,
}