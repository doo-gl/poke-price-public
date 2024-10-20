import {BaseCrudRepository} from "../../database/BaseCrudRepository";
import {firestoreHolder} from "../../database/FirestoreHolder";
import {baseEntityConverter} from "../../database/BaseEntityConverter";
import {databaseStatsLogger} from "../../infrastructure/express/DatabaseStatsLogger";
import {UserEntity} from "./UserEntity";
import {entityCreatorFactory} from "../../database/EntityCreatorFactory";
import {entityUpdaterFactory} from "../../database/EntityUpdaterFactory";
import {Firestore} from "../../external-lib/Firebase";

const COLLECTION_NAME = 'user';

class UserRepository extends BaseCrudRepository<UserEntity> {
  constructor(
    db:Firestore
  ) {
    super(
      db,
      COLLECTION_NAME,
      (data) => baseEntityConverter.convert<UserEntity>(data),
      stats => databaseStatsLogger.log(stats)
    );
  }
}

const store = firestoreHolder.get();
const instance = new UserRepository(store);
export const userRepository = instance;
export const baseUserCreator = entityCreatorFactory.build<UserEntity>(userRepository, COLLECTION_NAME);
export const userUpdater = entityUpdaterFactory.build<UserEntity>(userRepository, COLLECTION_NAME);