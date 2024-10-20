import {BaseCrudRepository} from "../../database/BaseCrudRepository";
import {baseEntityConverter} from "../../database/BaseEntityConverter";
import {firestoreHolder} from "../../database/FirestoreHolder";
import {databaseStatsLogger} from "../../infrastructure/express/DatabaseStatsLogger";
import {CardRankingEntity} from "./CardRankingEntity";
import {entityUpdaterFactory} from "../../database/EntityUpdaterFactory";
import {entityCreatorFactory} from "../../database/EntityCreatorFactory";
import {Firestore} from "../../external-lib/Firebase";

const COLLECTION_NAME = 'card-ranking';

class CardRankingRepository extends BaseCrudRepository<CardRankingEntity> {
  constructor(
    db:Firestore
  ) {
    super(
      db,
      COLLECTION_NAME,
      (data) => baseEntityConverter.convert<CardRankingEntity>(data),
      stats => databaseStatsLogger.log(stats)
    );
  }
}

const store = firestoreHolder.get();
const instance = new CardRankingRepository(store);
export const cardRankingRepository = instance;
export const baseCardRankingUpdater = entityUpdaterFactory.build(cardRankingRepository, COLLECTION_NAME);
export const baseCardRankingCreator = entityCreatorFactory.build(cardRankingRepository, COLLECTION_NAME);