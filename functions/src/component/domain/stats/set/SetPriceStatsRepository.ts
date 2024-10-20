import {BaseCrudRepository} from "../../../database/BaseCrudRepository";
import {firestoreHolder} from "../../../database/FirestoreHolder";
import {baseEntityConverter} from "../../../database/BaseEntityConverter";
import {SetPriceStatsEntity} from "./SetPriceStatsEntity";
import {databaseStatsLogger} from "../../../infrastructure/express/DatabaseStatsLogger";
import {Firestore} from "../../../external-lib/Firebase";

const COLLECTION_NAME = 'set-price-stat';

class SetPriceStatsRepository extends BaseCrudRepository<SetPriceStatsEntity> {
  constructor(
    db:Firestore
  ) {
    super(
      db,
      COLLECTION_NAME,
      (data) => baseEntityConverter.convert<SetPriceStatsEntity>(data),
      stats => databaseStatsLogger.log(stats)
    );
  }
}

const store = firestoreHolder.get();
const instance = new SetPriceStatsRepository(store);
export const setPriceStatsRepository = instance;