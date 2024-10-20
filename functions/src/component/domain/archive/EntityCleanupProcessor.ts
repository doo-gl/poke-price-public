import {expiredEntryRemover} from "../../database/cache/ExpiredEntryRemover";
import {BaseCrudRepository} from "../../database/BaseCrudRepository";
import {firestoreHolder} from "../../database/FirestoreHolder";
import {databaseStatsLogger} from "../../infrastructure/express/DatabaseStatsLogger";
import {Entity} from "../../database/Entity";
import moment from "moment";
import {momentToTimestamp} from "../../tools/TimeConverter";
import {batchArray} from "../../tools/ArrayBatcher";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";
import {cacheRepository} from "../../database/cache/CacheRepository";
import {cardPriceDataImportAttemptRepository} from "../card-price-data/CardPriceDataImportAttemptRepository";


const deleteOldEntities = async (collectionName:string, maxAgeDays:number):Promise<void> => {
  const firestore = firestoreHolder.get()
  const queue = new ConcurrentPromiseQueue({maxNumberOfConcurrentPromises: 1})
  const repo = new BaseCrudRepository<Entity>(firestore, collectionName, () => null, databaseStatsLogger.log)

  const cutOff = moment().subtract(maxAgeDays, "days")
  const oldEntityIds = new Array<string>()
  await repo.iterator()
    .queries([{field: "dateCreated", operation: "<=", value: momentToTimestamp(cutOff)}])
    .iterate(async entity => {
      oldEntityIds.push(entity.id)
    })
  const batchedOldEntityIds = batchArray(oldEntityIds, 500)
  await Promise.all(batchedOldEntityIds.map(idBatch => queue.addPromise(async () => {
    await repo.batchDelete(idBatch)
  })))

}

const cleanUp = async () => {

  await deleteOldEntities(cacheRepository.collectionName, 30)
  await deleteOldEntities(cardPriceDataImportAttemptRepository.collectionName, 30)


}

export const entityCleanupProcessor = {
  cleanUp,
}