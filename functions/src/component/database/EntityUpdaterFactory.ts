import {BaseCrudRepository} from "./BaseCrudRepository";
import {Entity, Update} from "./Entity";
import {logger} from "firebase-functions";
import {NotFoundError} from "../error/NotFoundError";

export interface EntityUpdater<T extends Entity> {
  /**
   * @deprecated The method should not be used
   */
  update:(id:string, update:Update<T>) => Promise<T>
  updateOnly:(id:string, update:Update<T>) => Promise<void>
  updateAndReturn:(id:string, update:Update<T>) => Promise<T>
  merge:(id:string, update:Update<T>) => Promise<T>
}

const update = async <T extends Entity> (
  repo:BaseCrudRepository<T>,
  entityName:string,
  id:string,
  updateEntity:Update<T>
):Promise<T> => {
  // logger.debug(`Updating ${entityName} with id: ${id}, fields: ${Object.keys(updateEntity).join(',')}`);
  return repo.updateOne(id, updateEntity)
    .then(result => {
      if (!result) {
        throw new NotFoundError(`Failed to find ${entityName} with id: ${id}`);
      }
      logger.debug(`Updated ${entityName} with id: ${id}`);
      return result;
    })
}

const updateOnly = async <T extends Entity> (
  repo:BaseCrudRepository<T>,
  entityName:string,
  id:string,
  updateEntity:Update<T>
):Promise<void> => {
  // logger.debug(`Updating ${entityName} with id: ${id}, fields: ${Object.keys(updateEntity).join(',')}`);
  await repo.update(id, updateEntity)
  // logger.debug(`Updated ${entityName} with id: ${id}`);
}

const merge = async <T extends Entity> (
  repo:BaseCrudRepository<T>,
  entityName:string,
  id:string,
  updateEntity:Update<T>
):Promise<T> => {
  // logger.debug(`Merging ${entityName} with id: ${id}, fields: ${Object.keys(updateEntity).join(',')}`);
  return repo.mergeOne(id, updateEntity)
    .then(result => {
      if (!result) {
        throw new NotFoundError(`Failed to find ${entityName} with id: ${id}`);
      }
      // logger.debug(`Merged ${entityName} with id: ${id}`);
      return result;
    })
}

const build = <T extends Entity>(repo:BaseCrudRepository<T>, entityName:string):EntityUpdater<T> => {
  return {
    update: (id, updateEnt) => update<T>(repo, entityName, id, updateEnt),
    updateAndReturn: (id, updateEnt) => update<T>(repo, entityName, id, updateEnt),
    updateOnly: (id, updateEnt) => updateOnly<T>(repo, entityName, id, updateEnt),
    merge: (id, updateEnt) => merge<T>(repo, entityName, id, updateEnt),
  }
}

export const entityUpdaterFactory = {
  build,
}