import {BaseCrudRepository} from "./BaseCrudRepository";
import {Create, Entity} from "./Entity";
import {logger} from "firebase-functions";

export interface EntityCreator<T extends Entity> {
  create:(newEntity:Create<T>) => Promise<T>,
  batchCreate:(newEntities:Array<Create<T>>) => Promise<number>
}

const create = async <T extends Entity>(repo:BaseCrudRepository<T>, entityName:string, newEntity:Create<T>):Promise<T> => {
  // logger.debug(`Creating ${entityName}`);
  const createdEntity:T = await repo.create(newEntity);
  // logger.debug(`Created ${entityName} with id: ${createdEntity.id}`)
  return createdEntity;
}

const batchCreate = async <T extends Entity>(repo:BaseCrudRepository<T>, entityName:string, newEntities:Array<Create<T>>):Promise<number> => {
  // logger.debug(`Creating ${newEntities.length} ${entityName} in batch`);
  const result = await repo.batchCreate(newEntities);
  // logger.debug(`Created ${newEntities.length} ${entityName} in batch`)
  return result;
}

const build = <T extends Entity>(repo:BaseCrudRepository<T>, entityName:string):EntityCreator<T> => {
  return {
    create: newEntity => create<T>(repo, entityName, newEntity),
    batchCreate: newEntities => batchCreate<T>(repo, entityName, newEntities),
  }
}

export const entityCreatorFactory = {
  build,
}