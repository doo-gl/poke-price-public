import {BaseCrudRepository} from "../BaseCrudRepository";
import {firestoreHolder} from "../FirestoreHolder";
import {baseEntityConverter} from "../BaseEntityConverter";
import {CacheEntryEntity} from "./CacheEntryEntity";
import {databaseStatsLogger} from "../../infrastructure/express/DatabaseStatsLogger";
import {Firestore} from "../../external-lib/Firebase";

const COLLECTION_NAME = 'cache';

class CacheRepository extends BaseCrudRepository<CacheEntryEntity> {
  constructor(
    db:Firestore
  ) {
    super(
      db,
      COLLECTION_NAME,
      (data) => baseEntityConverter.convert<CacheEntryEntity>(data),
      stats => databaseStatsLogger.log(stats)
    );
  }
}

const store = firestoreHolder.get();
const instance = new CacheRepository(store);
export const cacheRepository = instance;