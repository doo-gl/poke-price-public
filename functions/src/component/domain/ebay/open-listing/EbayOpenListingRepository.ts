import {BaseCrudRepository} from "../../../database/BaseCrudRepository";
import {firestoreHolder} from "../../../database/FirestoreHolder";
import {baseEntityConverter} from "../../../database/BaseEntityConverter";
import {databaseStatsLogger} from "../../../infrastructure/express/DatabaseStatsLogger";
import {EbayOpenListingEntity} from "./EbayOpenListingEntity";
import {entityCreatorFactory} from "../../../database/EntityCreatorFactory";
import {entityUpdaterFactory} from "../../../database/EntityUpdaterFactory";
import {Firestore} from "../../../external-lib/Firebase";

const COLLECTION_NAME = 'ebay-open-listing';

class EbayOpenListingRepository extends BaseCrudRepository<EbayOpenListingEntity> {
  constructor(
    db:Firestore
  ) {
    super(
      db,
      COLLECTION_NAME,
      (data) => baseEntityConverter.convert<EbayOpenListingEntity>(data),
      stats => databaseStatsLogger.log(stats)
    );
  }
}

const store = firestoreHolder.get();
const instance = new EbayOpenListingRepository(store);
export const ebayOpenListingRepository = instance;
export const ebayOpenListingCreator = entityCreatorFactory.build(ebayOpenListingRepository, COLLECTION_NAME);
export const ebayOpenListingUpdater = entityUpdaterFactory.build(ebayOpenListingRepository, COLLECTION_NAME);