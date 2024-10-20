
import {logger} from "firebase-functions";
import {Create, MongoEntity} from "./MongoEntity";
import {MongoBaseCrudRepository} from "./MongoBaseCrudRepository";

export interface EntityCreator<T extends MongoEntity> {
  create:(newEntity:Create<T>) => Promise<T>
}

const create = async <T extends MongoEntity>(repo:MongoBaseCrudRepository<T>, newEntity:Create<T>):Promise<T> => {
  logger.info(`Creating ${repo.collectionName}`);
  const createdEntity:T = await repo.createAndReturn(newEntity);
  logger.info(`Created ${repo.collectionName} with id: ${createdEntity._id}`)
  return createdEntity;
}

const build = <T extends MongoEntity>(repo:MongoBaseCrudRepository<T>):EntityCreator<T> => {
  return {
    create: newEntity => create<T>(repo, newEntity),
  }
}

export const mongoEntityCreatorFactory = {
  build,
}