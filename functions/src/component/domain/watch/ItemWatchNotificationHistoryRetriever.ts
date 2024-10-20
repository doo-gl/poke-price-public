import {
  ItemWatchNotificationHistoryEntity,
  itemWatchNotificationHistoryRepository,
} from "./ItemWatchNotificationHistoryEntity";
import {batchIds} from "../../database/BaseCrudRepository";
import {dedupe} from "../../tools/ArrayDeduper";
import {flattenArray} from "../../tools/ArrayFlattener";


const retrieveByItemWatchIdAndNewListingIds = async (itemWatchId:string, listingIds:Array<string>):Promise<Array<ItemWatchNotificationHistoryEntity>> => {
  const idBatches = batchIds(listingIds)
  const resultBatches = await Promise.all(
    idBatches.map(async idBatch => {
      return await itemWatchNotificationHistoryRepository.getMany([
        { field: "itemWatchId", operation: "==", value: itemWatchId },
        { field: "notificationDetails.emailType", operation: "==", value: 'NEW_LISTINGS' },
        { field: "notificationDetails.newListingIds", operation: "array-contains-any", value: idBatch },
      ])
    })
  )
  return dedupe(flattenArray(resultBatches), i => i.id)
}

export const itemWatchNotificationHistoryRetriever = {
  retrieveByItemWatchIdAndNewListingIds,
}