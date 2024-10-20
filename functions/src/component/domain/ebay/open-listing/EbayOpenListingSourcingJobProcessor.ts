import {logger} from "firebase-functions";
import {taskRunner} from "../../../infrastructure/TaskRunner";
import {ebayOpenListingSourcer} from "./EbayOpenListingSourcer";
import {TaskSupplierBuilder} from "../../../infrastructure/TaskSupplierBuilder";
import {ItemEntity, itemRepository} from "../../item/ItemEntity";
import {itemRetriever} from "../../item/ItemRetriever";

const TIME_TO_RUN_FOR_SECONDS = 240;
const MAX_CONCURRENT_TASKS = 6;

const processItem = async (item:ItemEntity) => {
  logger.info(`Importing data for item: ${item._id}, current next source time: ${item.nextEbayOpenListingSourcingTime.toISOString()}`)
  const start = new Date()
  const result = await ebayOpenListingSourcer.sourceForItem(item)
  const end = new Date()
  logger.info(`Imported data for item: ${item._id}, time taken: ${end.getTime() - start.getTime()}ms`, result);
  if (result.captcha) {
    logger.error(`Captcha encountered on item: ${item._id}`)
  }
}

const process = async () => {

  const taskSupplier = new TaskSupplierBuilder<ItemEntity>()
    .dataName(itemRepository.collectionName)
    .idMapper(item => item._id.toString())
    .itemRetriever(async (limit:number) => {
      const items = await itemRetriever.retrieveByNextEbayOpenListingSourcingAsc(limit);
      return items
      // return items.filter(item => timestampToMoment(item.nextEbayOpenListingSourcingTime).isSameOrBefore(moment()))
    })
    .minItemCount(MAX_CONCURRENT_TASKS)
    .taskMapper(item => processItem(item))
    .build();
  await taskRunner.runFor(
    TIME_TO_RUN_FOR_SECONDS,
    MAX_CONCURRENT_TASKS,
    taskSupplier,
    (err) => {
      logger.error(`Error while processing task`, err);
    }
  )

}

export const ebayOpenListingSourcingJobProcessor = {
  process,
}