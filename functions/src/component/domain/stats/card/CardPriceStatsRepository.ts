import {BaseCrudRepository} from "../../../database/BaseCrudRepository";
import {firestoreHolder} from "../../../database/FirestoreHolder";
import {baseEntityConverter} from "../../../database/BaseEntityConverter";
import {CardPriceStatsEntity} from "./CardPriceStatsEntity";
import {databaseStatsLogger} from "../../../infrastructure/express/DatabaseStatsLogger";
import {entityCreatorFactory} from "../../../database/EntityCreatorFactory";
import {Firestore} from "../../../external-lib/Firebase";

const COLLECTION_NAME = 'card-price-stat';

class CardPriceStatsRepository extends BaseCrudRepository<CardPriceStatsEntity> {
  constructor(
    db:Firestore
  ) {
    super(
      db,
      COLLECTION_NAME,
      (data) => baseEntityConverter.convert<CardPriceStatsEntity>(data),
      stats => databaseStatsLogger.log(stats)
    );
  }
}

const store = firestoreHolder.get();
const instance = new CardPriceStatsRepository(store);
export const cardPriceStatsRepository = instance;
export const baseCardPriceStatsCreator = entityCreatorFactory.build(cardPriceStatsRepository, cardPriceStatsRepository.collectionName);