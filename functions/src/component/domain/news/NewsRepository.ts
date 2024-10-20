import {BaseCrudRepository} from "../../database/BaseCrudRepository";

import {firestoreHolder} from "../../database/FirestoreHolder";
import {baseEntityConverter} from "../../database/BaseEntityConverter";
import {NewsEntity} from "./NewsEntity";
import {databaseStatsLogger} from "../../infrastructure/express/DatabaseStatsLogger";
import {entityUpdaterFactory} from "../../database/EntityUpdaterFactory";
import {Firestore} from "../../external-lib/Firebase";

const COLLECTION_NAME = 'news';

class NewsRepository extends BaseCrudRepository<NewsEntity> {
  constructor(
    db:Firestore
  ) {
    super(
      db,
      COLLECTION_NAME,
      (data) => baseEntityConverter.convert<NewsEntity>(data),
      stats => databaseStatsLogger.log(stats)
    );
  }
}

const store = firestoreHolder.get();
const instance = new NewsRepository(store);
export const newsRepository = instance;
export const baseNewsUpdater = entityUpdaterFactory.build(newsRepository, COLLECTION_NAME);