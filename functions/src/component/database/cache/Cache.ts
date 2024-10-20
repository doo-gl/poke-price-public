import {singleResultRepoQuerier} from "../SingleResultRepoQuerier";
import {cacheRepository} from "./CacheRepository";
import {CacheEntryEntity, createCacheKey} from "./CacheEntryEntity";
import moment from "moment";
import {momentToTimestamp, timestampToMoment} from "../../tools/TimeConverter";
import {Create} from "../Entity";
import {logger} from "firebase-functions";
import {queryString} from "../../external-lib/QueryString";


const get = async <T>(key:string, valueMapper:(value:any) => T):Promise<T|null> => {
  const entry:CacheEntryEntity|null = await singleResultRepoQuerier.query(
    cacheRepository,
    [
      { name: "key", value: key },
    ],
    'cache entry'
  );
  if (!entry) {
    return null;
  }
  const now = moment();
  const hasExpired = timestampToMoment(entry.dateEntryExpires).isBefore(now);
  if (hasExpired) {
    logger.info(`Cached entry with key: ${key} has expired, removing.`)
    await cacheRepository.delete(entry.id);
    return null;
  }
  const value = valueMapper(entry.value);
  return value;
}

const put = async (cacheEntry:Create<CacheEntryEntity>):Promise<object> => {
  const preExistingEntries = await cacheRepository.getMany([{ field: "key", operation: "==", value: cacheEntry.key }]);
  if (preExistingEntries.length > 0) {
    return preExistingEntries[0].value;
  }
  const createdEntry = await cacheRepository.create(cacheEntry);
  return createdEntry.value;
}

export class Cache<Q,T> {

  constructor(
    readonly valueRetriever:(query:Q)=>Promise<T>,
    readonly valueMapper:(value:any)=>T,
    readonly entryLifetimeInMillis:number,
  ) {}

  async tryGetFromCache(entryType:string, query:Q):Promise<T|null> {
    const key = this.queryToKey(entryType, query)
    const checkCacheStart = moment()
    const cachedValue:T|null = await get(key, this.valueMapper);
    const checkCacheEnd = moment()
    logger.info(`Checking cache for ${key} took: ${checkCacheEnd.diff(checkCacheStart, 'milliseconds')}ms, value found: ${!!cachedValue}`);
    return cachedValue;
  }

  async getValue(entryType:string, query:Q):Promise<T> {
    const key = this.queryToKey(entryType, query)
    const retrieveValueStart = moment()
    const value:T = await this.valueRetriever(query);
    const retrieveValueEnd = moment()
    logger.info(`Retrieving value for ${key} took: ${retrieveValueEnd.diff(retrieveValueStart, 'milliseconds')}ms`);
    return value;
  }

  async getValueAndCache(entryType:string, query:Q):Promise<T> {
    const key = this.queryToKey(entryType, query)
    const value = await this.getValue(entryType, query)
    try {
      const entryExpiry = moment().add(this.entryLifetimeInMillis, "milliseconds");

      const saveValueStart = moment()
      const cacheEntry:Create<CacheEntryEntity> = {
        entryType,
        key,
        value,
        dateEntryExpires: momentToTimestamp(entryExpiry),
      };
      await put(cacheEntry);
      const saveValueEnd = moment()
      logger.info(`Adding cached response for key: ${key}, expiring: ${entryExpiry.toISOString()}, took: ${saveValueEnd.diff(saveValueStart, 'milliseconds')}ms`)
    } catch (err:any) {
      logger.error(`Error while saving cache entry: ${err.message}`, err)
    }
    return value;
  }

  queryToKey(entryType:string, query:Q):string {
    // @ts-ignore
    const stringifiedQuery = queryString.stringify(query);
    const key = createCacheKey(entryType, stringifiedQuery);
    return key
  }

  async get(entryType:string, query:Q):Promise<T> {

    const cachedValue:T|null = await this.tryGetFromCache(entryType, query)
    if (cachedValue) {
      return cachedValue;
    }

    const value = await this.getValueAndCache(entryType, query)
    return value;
  }

  async clear(entryType:string):Promise<void> {
    await cacheRepository.iterator()
      .sort([])
      .queries([{field: "entryType", operation: "==", value: entryType}])
      .iterateBatch(async (entities:Array<CacheEntryEntity>) => {
        const ids = entities.map(entity => entity.id);
        await cacheRepository.batchDelete(ids)
        return false
      })
  }

}

export class CacheBuilder<Q, T> {
  private _valueMapper:(value:any)=>T = value => <T>value;
  private _entryLifetimeInMillis:number = 1000 * 60 * 5; // 5 minutes

  mapper(valueMapper:(value:any)=>T):CacheBuilder<Q, T> {
    this._valueMapper = valueMapper;
    return this;
  }

  entryLifetimeInMillis(entryLifetimeInMillis:number):CacheBuilder<Q, T> {
    this._entryLifetimeInMillis = entryLifetimeInMillis;
    return this;
  }

  entryLifetimeInMinutes(entryLifetimeInMinutes:number):CacheBuilder<Q, T> {
    return this.entryLifetimeInMillis(entryLifetimeInMinutes * 60 * 1000);
  }

  build(valueRetriever:(query:Q)=>Promise<T>):Cache<Q, T> {
    return new Cache<Q, T>(
      valueRetriever,
      this._valueMapper,
      this._entryLifetimeInMillis
    );
  }
}

export const cacheBuilder = <Q, T>() => new CacheBuilder<Q,T>();