

import {databaseStatsLogger} from "../../../infrastructure/express/DatabaseStatsLogger";
import {AdminUserEntity} from "./AdminUserEntity";
import {baseEntityConverter} from "../../../database/BaseEntityConverter";
import {firestoreHolder} from "../../../database/FirestoreHolder";
import {BaseCrudRepository} from "../../../database/BaseCrudRepository";
import {Firestore} from "../../../external-lib/Firebase";

const COLLECTION_NAME = 'admin-user';

class AdminUserRepository extends BaseCrudRepository<AdminUserEntity> {
  constructor(
    db:Firestore
  ) {
    super(
      db,
      COLLECTION_NAME,
      (data) => baseEntityConverter.convert<AdminUserEntity>(data),
      stats => databaseStatsLogger.log(stats)
    );
  }
}

const store = firestoreHolder.get();
const instance = new AdminUserRepository(store);
export const adminUserRepository = instance;