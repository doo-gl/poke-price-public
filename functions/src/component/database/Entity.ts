import {Timestamp} from "../external-lib/Firebase";


export type Create<T> = Omit<T, keyof Entity>
export type Update<T> = Partial<Omit<T, keyof Entity>>

export interface Entity {
  id:string,
  dateCreated:Timestamp,
  dateLastModified:Timestamp,
}