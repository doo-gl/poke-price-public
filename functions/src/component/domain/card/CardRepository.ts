import {BaseCrudRepository} from "../../database/BaseCrudRepository";
import {CardEntity} from "./CardEntity";
import {firestoreHolder} from "../../database/FirestoreHolder";
import {baseEntityConverter} from "../../database/BaseEntityConverter";
import {databaseStatsLogger} from "../../infrastructure/express/DatabaseStatsLogger";
import {Firestore} from "../../external-lib/Firebase";
import {DoubleWritingBaseCrudRepo} from "../../database/DoubleWritingBaseCrudRepo";
import {ItemEntity, itemRepository} from "../item/ItemEntity";
import {cardToItemConverter} from "../item/CardToItemConverter";

const COLLECTION_NAME = 'card';

class CardRepository extends BaseCrudRepository<CardEntity> {
  constructor(
    db:Firestore
  ) {
    super(
      db,
      COLLECTION_NAME,
      (data) => baseEntityConverter.convert<CardEntity>(data),
      stats => databaseStatsLogger.log(stats)
    );
  }
}

const store = firestoreHolder.get();
const instance = new CardRepository(store);
const cardToItemRepository = new DoubleWritingBaseCrudRepo<CardEntity, ItemEntity>(
  instance,
  itemRepository,
  cardToItemConverter
)
export const cardRepository = cardToItemRepository;