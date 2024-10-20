import {Create, MongoEntity, Update} from "./MongoEntity";
import {ObjectId} from "mongodb";


const create = <T extends MongoEntity> (value:Create<T>):MongoEntity => {
  const _id = new ObjectId();
  const dateCreated = new Date();
  const dateLastModified = new Date();
  return  {...value, _id, dateCreated, dateLastModified};
};

const update = <T extends MongoEntity>(value:Update<T>) => {
  const dateLastModified = new Date();
  return { ...value, dateLastModified };
}

export const mongoDocumentCreator = {
  create,
  update,
};