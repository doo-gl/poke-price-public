import {databaseStatsLogger} from "../../infrastructure/express/DatabaseStatsLogger";
import {DuplicateResultEntity} from "./DuplicateResultEntity";
import {baseEntityConverter} from "../BaseEntityConverter";
import {BaseCrudRepository} from "../BaseCrudRepository";
import {firestoreHolder} from "../FirestoreHolder";
import {entityCreatorFactory} from "../EntityCreatorFactory";
import {entityUpdaterFactory} from "../EntityUpdaterFactory";
import {Firestore} from "../../external-lib/Firebase";

export const COLLECTION_NAME = 'duplicate-result';

class DuplicateResultRepository extends BaseCrudRepository<DuplicateResultEntity> {

  constructor(
    db:Firestore
  ) {
    super(
      db,
      COLLECTION_NAME,
      (data) => baseEntityConverter.convert<DuplicateResultEntity>(data),
      stats => databaseStatsLogger.log(stats)
    );
  }

}

const store = firestoreHolder.get();
const instance = new DuplicateResultRepository(store);
export const duplicateResultRepository = instance;
export const duplicateResultCreator = entityCreatorFactory.build<DuplicateResultEntity>(duplicateResultRepository, COLLECTION_NAME);
export const duplicateResultUpdater = entityUpdaterFactory.build<DuplicateResultEntity>(duplicateResultRepository, COLLECTION_NAME);