import {BaseCrudRepository} from "../../database/BaseCrudRepository";
import {firestoreHolder} from "../../database/FirestoreHolder";
import {baseEntityConverter} from "../../database/BaseEntityConverter";
import {databaseStatsLogger} from "../../infrastructure/express/DatabaseStatsLogger";
import {ExchangeRateEntity} from "./ExchangeRateEntity";
import {entityCreatorFactory} from "../../database/EntityCreatorFactory";
import {Firestore} from "../../external-lib/Firebase";

const COLLECTION_NAME = 'exchange-rate';

class ExchangeRateRepository extends BaseCrudRepository<ExchangeRateEntity> {
  constructor(
    db:Firestore
  ) {
    super(
      db,
      COLLECTION_NAME,
      (data) => baseEntityConverter.convert<ExchangeRateEntity>(data),
      stats => databaseStatsLogger.log(stats)
    );
  }
}

const store = firestoreHolder.get();
const instance = new ExchangeRateRepository(store);
export const exchangeRateRepository = instance;
export const exchangeRateCreator = entityCreatorFactory.build<ExchangeRateEntity>(exchangeRateRepository, COLLECTION_NAME);