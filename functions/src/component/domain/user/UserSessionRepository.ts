import {BaseCrudRepository} from "../../database/BaseCrudRepository";
import {firestoreHolder} from "../../database/FirestoreHolder";
import {baseEntityConverter} from "../../database/BaseEntityConverter";
import {databaseStatsLogger} from "../../infrastructure/express/DatabaseStatsLogger";
import {entityCreatorFactory} from "../../database/EntityCreatorFactory";
import {entityUpdaterFactory} from "../../database/EntityUpdaterFactory";
import {UserSessionEntity} from "./UserSessionEntity";
import {Firestore} from "../../external-lib/Firebase";

const COLLECTION_NAME = 'user-session';

class UserSessionRepository extends BaseCrudRepository<UserSessionEntity> {
  constructor(
    db:Firestore
  ) {
    super(
      db,
      COLLECTION_NAME,
      (data) => baseEntityConverter.convert<UserSessionEntity>(data),
      stats => databaseStatsLogger.log(stats)
    );
  }
}

const store = firestoreHolder.get();
const instance = new UserSessionRepository(store);
export const userSessionRepository = instance;
export const userSessionCreator = entityCreatorFactory.build<UserSessionEntity>(userSessionRepository, COLLECTION_NAME);
export const userSessionUpdater = entityUpdaterFactory.build<UserSessionEntity>(userSessionRepository, COLLECTION_NAME);