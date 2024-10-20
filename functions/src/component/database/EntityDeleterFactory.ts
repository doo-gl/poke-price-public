import {Entity} from "./Entity";
import {BaseCrudRepository} from "./BaseCrudRepository";
import {logger} from "firebase-functions";
import {batchArray} from "../tools/ArrayBatcher";


export interface EntityDeleter<T extends Entity> {
  delete:(id:string) => Promise<boolean>,
  batchDelete:(ids:Array<string>) => Promise<number>,
}

const deleteEntity = async <T extends Entity> (
  repo:BaseCrudRepository<T>,
  id:string,
):Promise<boolean> => {
  const entityName = repo.collectionName;
  logger.debug(`Deleting ${entityName} with id: ${id}.`);
  return repo.delete(id);
}

const batchDelete = async <T extends Entity> (
  repo:BaseCrudRepository<T>,
  ids:Array<string>,
):Promise<number> => {
  const entityName = repo.collectionName;
  logger.debug(`Deleting ${ids.length} ${entityName} in batches.`);
  const idBatches = batchArray(ids, 100)
  for (let idBatchIndex = 0; idBatchIndex < idBatches.length; idBatchIndex++) {
    const idBatch = idBatches[idBatchIndex];
    logger.debug(`Deleting ${entityName} batch: ${idBatchIndex + 1} of ${idBatches.length}, size: ${idBatch.length}`)
    await repo.batchDelete(idBatch)
    logger.debug(`Deleted ${entityName} batch: ${idBatchIndex + 1} of ${idBatches.length}, size: ${idBatch.length}`)
  }
  return ids.length;
}

const build = <T extends Entity>(repo:BaseCrudRepository<T>):EntityDeleter<T> => {
  return {
    delete: (id) => deleteEntity<T>(repo, id),
    batchDelete: (ids) => batchDelete<T>(repo, ids),
  }
}

export const entityDeleterFactory = {
  build,
  batchDelete,
  deleteEntity,
}