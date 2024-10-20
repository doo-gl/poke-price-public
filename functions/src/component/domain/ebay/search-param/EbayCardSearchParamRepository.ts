import {BaseCrudRepository} from "../../../database/BaseCrudRepository";
import {firestoreHolder} from "../../../database/FirestoreHolder";
import {baseEntityConverter} from "../../../database/BaseEntityConverter";
import {EbayCardSearchParamEntity} from "./EbayCardSearchParamEntity";
import {databaseStatsLogger} from "../../../infrastructure/express/DatabaseStatsLogger";
import {Firestore} from "../../../external-lib/Firebase";

const COLLECTION_NAME = 'ebay-card-search-param';

class EbayCardSearchParamRepository extends BaseCrudRepository<EbayCardSearchParamEntity> {
  constructor(
    db:Firestore
  ) {
    super(
      db,
      COLLECTION_NAME,
      (data) => baseEntityConverter.convert<EbayCardSearchParamEntity>(data),
      stats => databaseStatsLogger.log(stats)
    );
  }
}

const store = firestoreHolder.get();
const instance = new EbayCardSearchParamRepository(store);
export const ebayCardSearchParamRepository = instance;