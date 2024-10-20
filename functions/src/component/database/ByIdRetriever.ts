import {NotFoundError} from "../error/NotFoundError";
import {BaseCrudRepository, FirestoreBaseCrudRepository} from "./BaseCrudRepository";
import {Entity} from "./Entity";
import {MongoEntity} from "./mongo/MongoEntity";
import {MongoBaseCrudRepository} from "./mongo/MongoBaseCrudRepository";
import {ObjectId} from "mongodb";

const retrieve = <T extends Entity>(repo:FirestoreBaseCrudRepository<T>, id:string, dataName:string):Promise<T> => {
  return repo.getOne(id)
    .then(result => {
      if (!result) {
        throw new NotFoundError(`Failed to find ${dataName} with id: ${id}`);
      }
      return result;
    })
}

const retrieveMongo = <T extends MongoEntity>(repo:MongoBaseCrudRepository<T>, id:ObjectId):Promise<T> => {
  return repo.getOne(id)
    .then(result => {
      if (!result) {
        throw new NotFoundError(`Failed to find ${repo.collectionName} with id: ${id}`);
      }
      return result;
    })
}

export const byIdRetriever = {
  retrieve,
  retrieveMongo,
}