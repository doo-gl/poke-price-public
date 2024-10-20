import {BaseCrudRepository} from "../../database/BaseCrudRepository";
import {SetEntity} from "./SetEntity";
import {baseEntityConverter} from "../../database/BaseEntityConverter";
import {firestoreHolder} from "../../database/FirestoreHolder";
import {databaseStatsLogger} from "../../infrastructure/express/DatabaseStatsLogger";
import {Firestore} from "../../external-lib/Firebase";

const COLLECTION_NAME = 'set';

class SetRepository extends BaseCrudRepository<SetEntity> {
  constructor(
    db:Firestore
  ) {
    super(
      db,
      COLLECTION_NAME,
      (data) => baseEntityConverter.convert<SetEntity>(data),
      stats => databaseStatsLogger.log(stats)
    );
  }
}

const store = firestoreHolder.get();
const instance = new SetRepository(store);
export const setRepository = instance;