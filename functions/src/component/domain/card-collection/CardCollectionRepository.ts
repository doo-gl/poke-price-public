import {BaseCrudRepository} from "../../database/BaseCrudRepository";
import {baseEntityConverter} from "../../database/BaseEntityConverter";
import {databaseStatsLogger} from "../../infrastructure/express/DatabaseStatsLogger";
import {firestoreHolder} from "../../database/FirestoreHolder";
import {entityCreatorFactory} from "../../database/EntityCreatorFactory";
import {entityUpdaterFactory} from "../../database/EntityUpdaterFactory";
import {CardCollectionEntity} from "./CardCollectionEntity";
import {Firestore} from "../../external-lib/Firebase";


const COLLECTION_NAME = 'card-collection';

class CardCollectionRepository extends BaseCrudRepository<CardCollectionEntity> {
  constructor(
    db:Firestore
  ) {
    super(
      db,
      COLLECTION_NAME,
      (data) => baseEntityConverter.convert<CardCollectionEntity>(data),
      stats => databaseStatsLogger.log(stats)
    );
  }
}

const store = firestoreHolder.get();
const instance = new CardCollectionRepository(store);
export const cardCollectionRepository = instance;
export const baseCardCollectionCreator = entityCreatorFactory.build(instance, COLLECTION_NAME);
export const baseCardCollectionUpdater = entityUpdaterFactory.build(instance, COLLECTION_NAME);