import {Entity} from "../../../database/Entity";
import {BaseCrudRepository} from "../../../database/BaseCrudRepository";
import {baseEntityConverter} from "../../../database/BaseEntityConverter";
import {databaseStatsLogger} from "../../../infrastructure/express/DatabaseStatsLogger";
import {firestoreHolder} from "../../../database/FirestoreHolder";
import {entityCreatorFactory} from "../../../database/EntityCreatorFactory";
import {entityUpdaterFactory} from "../../../database/EntityUpdaterFactory";
import {Firestore, Timestamp} from "../../../external-lib/Firebase";



export interface TempOpenListingMigrateEntity extends Entity {
  lastProcessedDate:Timestamp
  lastProcessedId:string,
}

const COLLECTION_NAME = 'temp-open-listing-migrate';

class TempOpenListingMigrateRepository extends BaseCrudRepository<TempOpenListingMigrateEntity> {
  constructor(
    db:Firestore
  ) {
    super(
      db,
      COLLECTION_NAME,
      (data) => baseEntityConverter.convert<TempOpenListingMigrateEntity>(data),
      stats => databaseStatsLogger.log(stats)
    );
  }
}

const store = firestoreHolder.get();
const instance = new TempOpenListingMigrateRepository(store);
export const tempOpenListingMigrateRepository = instance;
export const tempOpenListingMigrateCreator = entityCreatorFactory.build(tempOpenListingMigrateRepository, COLLECTION_NAME);
export const tempOpenListingMigrateUpdater = entityUpdaterFactory.build(tempOpenListingMigrateRepository, COLLECTION_NAME);