import {BaseCrudRepository} from "../../database/BaseCrudRepository";
import {baseEntityConverter} from "../../database/BaseEntityConverter";
import {databaseStatsLogger} from "../../infrastructure/express/DatabaseStatsLogger";
import {firestoreHolder} from "../../database/FirestoreHolder";
import {CardOwnershipEntity} from "./CardOwnershipEntity";
import {entityCreatorFactory} from "../../database/EntityCreatorFactory";
import {entityUpdaterFactory} from "../../database/EntityUpdaterFactory";
import {Firestore} from "../../external-lib/Firebase";

const COLLECTION_NAME = 'card-ownership';

class CardOwnershipRepository extends BaseCrudRepository<CardOwnershipEntity> {
  constructor(
    db:Firestore
  ) {
    super(
      db,
      COLLECTION_NAME,
      (data) => baseEntityConverter.convert<CardOwnershipEntity>(data),
      stats => databaseStatsLogger.log(stats)
    );
  }
}

const store = firestoreHolder.get();
const instance = new CardOwnershipRepository(store);
export const cardOwnershipRepository = instance;
export const baseCardOwnershipCreator = entityCreatorFactory.build(cardOwnershipRepository, COLLECTION_NAME);
export const baseCardOwnershipUpdater = entityUpdaterFactory.build(cardOwnershipRepository, COLLECTION_NAME);