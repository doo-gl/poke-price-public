import {Entity} from "./Entity";
import {BaseCrudRepository} from "./BaseCrudRepository";
import {EntityCreator, entityCreatorFactory} from "./EntityCreatorFactory";
import {EntityUpdater, entityUpdaterFactory} from "./EntityUpdaterFactory";
import {firestoreHolder} from "./FirestoreHolder";
import {baseEntityConverter} from "./BaseEntityConverter";
import {databaseStatsLogger} from "../infrastructure/express/DatabaseStatsLogger";
import {EntityDeleter, entityDeleterFactory} from "./EntityDeleterFactory";

export interface RepositoryResult<T extends Entity> {
  repository:BaseCrudRepository<T>,
  creator:EntityCreator<T>,
  updater:EntityUpdater<T>,
  deleter:EntityDeleter<T>,
}

const build = <T extends Entity>(collectionName:string):RepositoryResult<T> => {
  const store = firestoreHolder.get();
  const repository = new BaseCrudRepository<T>(
    store,
    collectionName,
    (data) => baseEntityConverter.convert<T>(data),
    stats => databaseStatsLogger.log(stats)
  );
  const creator = entityCreatorFactory.build(repository, collectionName);
  const updater = entityUpdaterFactory.build(repository, collectionName);
  const deleter = entityDeleterFactory.build(repository);
  return {
    repository,
    creator,
    updater,
    deleter,
  }
}

export const repositoryFactory = {
  build,
}