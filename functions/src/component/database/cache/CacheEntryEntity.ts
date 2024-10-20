import {Entity} from "../Entity";
import {Timestamp} from "../../external-lib/Firebase";

export const createCacheKey = (entryType:string, query:string):string => {
  return `${entryType}|${query}`;
}

export interface CacheEntryEntity extends Entity {
  key:string,
  value:any,
  dateEntryExpires:Timestamp,
  entryType:string,
}