import {BaseCrudRepository} from "../../../../database/BaseCrudRepository";
import {baseEntityConverter} from "../../../../database/BaseEntityConverter";
import {databaseStatsLogger} from "../../../../infrastructure/express/DatabaseStatsLogger";
import {firestoreHolder} from "../../../../database/FirestoreHolder";
import {entityUpdaterFactory} from "../../../../database/EntityUpdaterFactory";
import {TempKeywordUrlEntity} from "./TempKeywordUrlEntity";
import {entityCreatorFactory} from "../../../../database/EntityCreatorFactory";
import {Firestore} from "../../../../external-lib/Firebase";

const COLLECTION_NAME = 'temp-keyword-url';

class TempKeywordUrlRepository extends BaseCrudRepository<TempKeywordUrlEntity> {
  constructor(
    db:Firestore
  ) {
    super(
      db,
      COLLECTION_NAME,
      (data) => baseEntityConverter.convert<TempKeywordUrlEntity>(data),
      stats => databaseStatsLogger.log(stats)
    );
  }
}

const store = firestoreHolder.get();
const instance = new TempKeywordUrlRepository(store);
export const tempKeywordUrlRepository = instance;
export const baseTempKeywordUrlUpdater = entityUpdaterFactory.build(tempKeywordUrlRepository, COLLECTION_NAME);
export const baseTempKeywordUrlCreator = entityCreatorFactory.build(tempKeywordUrlRepository, COLLECTION_NAME);