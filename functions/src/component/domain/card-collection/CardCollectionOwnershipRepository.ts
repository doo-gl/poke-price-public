import {BaseCrudRepository} from "../../database/BaseCrudRepository";
import {baseEntityConverter} from "../../database/BaseEntityConverter";
import {databaseStatsLogger} from "../../infrastructure/express/DatabaseStatsLogger";
import {firestoreHolder} from "../../database/FirestoreHolder";
import {entityCreatorFactory} from "../../database/EntityCreatorFactory";
import {entityUpdaterFactory} from "../../database/EntityUpdaterFactory";
import {CardCollectionOwnershipEntity} from "./CardCollectionOwnershipEntity";
import {Firestore} from "../../external-lib/Firebase";

const COLLECTION_NAME = 'card-collection-ownership';

class CardCollectionOwnershipRepository extends BaseCrudRepository<CardCollectionOwnershipEntity> {
  constructor(
    db:Firestore
  ) {
    super(
      db,
      COLLECTION_NAME,
      (data) => baseEntityConverter.convert<CardCollectionOwnershipEntity>(data),
      stats => databaseStatsLogger.log(stats)
    );
  }
}

const store = firestoreHolder.get();
const instance = new CardCollectionOwnershipRepository(store);
export const cardCollectionOwnershipRepository = instance;
export const baseCardCollectionOwnershipCreator = entityCreatorFactory.build(instance, COLLECTION_NAME);
export const baseCardCollectionOwnershipUpdater = entityUpdaterFactory.build(instance, COLLECTION_NAME);