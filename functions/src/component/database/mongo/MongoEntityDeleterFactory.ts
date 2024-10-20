
import {logger} from "firebase-functions";
import {MongoEntity} from "./MongoEntity";
import {MongoBaseCrudRepository} from "./MongoBaseCrudRepository";
import {ObjectId} from "mongodb";


export interface EntityDeleter<T extends MongoEntity> {
  delete:(id:ObjectId) => Promise<boolean>
}

const deleteEntity = async <T extends MongoEntity> (
  repo:MongoBaseCrudRepository<T>,
  id:ObjectId,
):Promise<boolean> => {
  const entityName = repo.collectionName;
  logger.info(`Deleting ${entityName} with id: ${id}.`);
  return repo.delete(id);
}

const build = <T extends MongoEntity>(repo:MongoBaseCrudRepository<T>):EntityDeleter<T> => {
  return {
    delete: (id) => deleteEntity<T>(repo, id),
  }
}

export const mongoEntityDeleterFactory = {
  build,
}