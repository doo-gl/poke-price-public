import {BaseCrudRepository} from "../../../../database/BaseCrudRepository";
import {baseEntityConverter} from "../../../../database/BaseEntityConverter";
import {databaseStatsLogger} from "../../../../infrastructure/express/DatabaseStatsLogger";
import {firestoreHolder} from "../../../../database/FirestoreHolder";
import {GlobalExcludeKeywordEntity} from "./GlobalExcludeKeywordEntity";
import {entityUpdaterFactory} from "../../../../database/EntityUpdaterFactory";
import {Firestore} from "../../../../external-lib/Firebase";

const COLLECTION_NAME = 'global-exclude-keyword';

class GlobalExcludeKeywordRepository extends BaseCrudRepository<GlobalExcludeKeywordEntity> {
  constructor(
    db:Firestore
  ) {
    super(
      db,
      COLLECTION_NAME,
      (data) => baseEntityConverter.convert<GlobalExcludeKeywordEntity>(data),
      stats => databaseStatsLogger.log(stats)
    );
  }
}

const store = firestoreHolder.get();
const instance = new GlobalExcludeKeywordRepository(store);
export const globalExcludeKeywordRepository = instance;
export const baseGlobalExcludeKeywordUpdater = entityUpdaterFactory.build(globalExcludeKeywordRepository, COLLECTION_NAME);