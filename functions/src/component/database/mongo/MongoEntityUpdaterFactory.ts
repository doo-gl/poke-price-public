import {logger} from "firebase-functions";
import {MongoEntity, Update} from "./MongoEntity";
import {MongoBaseCrudRepository} from "./MongoBaseCrudRepository";
import {ObjectId} from "mongodb";
import {NotFoundError} from "../../error/NotFoundError";

export interface EntityUpdater<T extends MongoEntity> {
  updateOnly:(id:ObjectId, update:Update<T>) => Promise<void>
  updateAndReturn:(id:ObjectId, update:Update<T>) => Promise<T>
}

const updateAndReturn = async <T extends MongoEntity> (
  repo:MongoBaseCrudRepository<T>,
  id:ObjectId,
  updateEntity:Update<T>
):Promise<T> => {
  logger.info(`Updating ${repo.collectionName} with id: ${id}, fields: ${Object.keys(updateEntity).join(',')}`);
  return repo.updateAndReturn(id, updateEntity)
    .then(result => {
      if (!result) {
        throw new NotFoundError(`Failed to find ${repo.collectionName} with id: ${id}`);
      }
      logger.info(`Updated ${repo.collectionName} with id: ${id}`);
      return result;
    })
}

const updateOnly = async <T extends MongoEntity> (
  repo:MongoBaseCrudRepository<T>,
  id:ObjectId,
  updateEntity:Update<T>
):Promise<void> => {
  logger.info(`Updating ${repo.collectionName} with id: ${id}, fields: ${Object.keys(updateEntity).join(',')}`);
  await repo.updateOnly(id, updateEntity)
  logger.info(`Updated ${repo.collectionName} with id: ${id}`);
}

const build = <T extends MongoEntity>(repo:MongoBaseCrudRepository<T>):EntityUpdater<T> => {
  return {
    updateAndReturn: (id, updateEnt) => updateAndReturn<T>(repo, id, updateEnt),
    updateOnly: (id, updateEnt) => updateOnly<T>(repo, id, updateEnt),
  }
}

export const mongoEntityUpdaterFactory = {
  build,
}