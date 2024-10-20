import {BaseCrudRepository} from "../../database/BaseCrudRepository";
import {baseEntityConverter} from "../../database/BaseEntityConverter";
import {databaseStatsLogger} from "../../infrastructure/express/DatabaseStatsLogger";
import {firestoreHolder} from "../../database/FirestoreHolder";
import {entityUpdaterFactory} from "../../database/EntityUpdaterFactory";
import {WebappHtmlEntity} from "./WebappHtmlEntity";
import {Firestore} from "../../external-lib/Firebase";


const COLLECTION_NAME = 'webapp-html';

class WebappHtmlRepository extends BaseCrudRepository<WebappHtmlEntity> {
  constructor(
    db:Firestore
  ) {
    super(
      db,
      COLLECTION_NAME,
      (data) => baseEntityConverter.convert<WebappHtmlEntity>(data),
      stats => databaseStatsLogger.log(stats)
    );
  }
}

const store = firestoreHolder.get();
const instance = new WebappHtmlRepository(store);
export const webappHtmlRepository = instance;
export const baseWebappHtmlUpdater = entityUpdaterFactory.build(webappHtmlRepository, COLLECTION_NAME);