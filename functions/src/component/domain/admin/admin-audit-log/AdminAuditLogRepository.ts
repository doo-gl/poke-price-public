
import {databaseStatsLogger} from "../../../infrastructure/express/DatabaseStatsLogger";
import {baseEntityConverter} from "../../../database/BaseEntityConverter";
import {firestoreHolder} from "../../../database/FirestoreHolder";
import {BaseCrudRepository} from "../../../database/BaseCrudRepository";
import {AdminAuditLogEntity} from "./AdminAuditLogEntity";
import {Firestore} from "../../../external-lib/Firebase";

const COLLECTION_NAME = 'admin-audit-log';

class AdminAuditLogRepository extends BaseCrudRepository<AdminAuditLogEntity> {
  constructor(
    db:Firestore
  ) {
    super(
      db,
      COLLECTION_NAME,
      (data) => baseEntityConverter.convert<AdminAuditLogEntity>(data),
      stats => databaseStatsLogger.log(stats)
    );
  }
}

const store = firestoreHolder.get();
const instance = new AdminAuditLogRepository(store);
export const adminAuditLogRepository = instance;