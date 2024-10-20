import {BaseCrudRepository} from "../../database/BaseCrudRepository";
import {CardPriceDataImportAttemptEntity} from "./CardPriceDataImportAttemptEntity";
import {baseEntityConverter} from "../../database/BaseEntityConverter";
import {firestoreHolder} from "../../database/FirestoreHolder";
import {databaseStatsLogger} from "../../infrastructure/express/DatabaseStatsLogger";
import {Firestore} from "../../external-lib/Firebase";

const COLLECTION_NAME = 'card-price-data-import-attempt';

class CardPriceDataImportAttemptRepository extends BaseCrudRepository<CardPriceDataImportAttemptEntity> {
  constructor(
    db:Firestore
  ) {
    super(
      db,
      COLLECTION_NAME,
      (data) => baseEntityConverter.convert<CardPriceDataImportAttemptEntity>(data),
      stats => databaseStatsLogger.log(stats)
    );
  }
}

const store = firestoreHolder.get();
const instance = new CardPriceDataImportAttemptRepository(store);
export const cardPriceDataImportAttemptRepository = instance;