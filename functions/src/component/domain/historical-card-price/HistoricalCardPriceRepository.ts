import {BaseCrudRepository} from "../../database/BaseCrudRepository";
import {HistoricalCardPriceEntity} from "./HistoricalCardPriceEntity";
import {baseEntityConverter} from "../../database/BaseEntityConverter";
import {firestoreHolder} from "../../database/FirestoreHolder";
import {databaseStatsLogger} from "../../infrastructure/express/DatabaseStatsLogger";
import {Firestore} from "../../external-lib/Firebase";

const COLLECTION_NAME = 'historical-card-price';

class HistoricalCardPriceRepository extends BaseCrudRepository<HistoricalCardPriceEntity> {

  constructor(
    db:Firestore
  ) {
    super(
      db,
      COLLECTION_NAME,
      (data) => baseEntityConverter.convert<HistoricalCardPriceEntity>(data),
      stats => databaseStatsLogger.log(stats)
    );
  }

}

const store = firestoreHolder.get();
const instance = new HistoricalCardPriceRepository(store);
export const historicalCardPriceRepository = instance;