import {ObjectId} from "mongodb";


export type Create<T> = Omit<T, keyof MongoEntity>
export type Update<T> = Partial<Omit<T, keyof MongoEntity>>

export interface BatchUpdate<T extends MongoEntity> {
  id:ObjectId,
  update:Update<T>
}

export interface MongoEntity {
  _id:ObjectId,
  legacyId?:string,
  dateCreated:Date,
  dateLastModified:Date,
}