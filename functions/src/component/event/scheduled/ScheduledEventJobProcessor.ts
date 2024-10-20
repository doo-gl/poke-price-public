import {logger} from "firebase-functions";
import moment from "moment/moment";
import {ScheduledEventEntity, scheduledEventRepository} from "./ScheduledEventEntity";
import {TaskSupplierBuilder} from "../../infrastructure/TaskSupplierBuilder";
import {taskRunner} from "../../infrastructure/TaskRunner";
import {scheduledEventRetriever} from "./ScheduledEventRetriever";
import {timestampToMoment} from "../../tools/TimeConverter";
import {scheduledEventSender} from "./ScheduledEventSender";


const TIME_TO_RUN_FOR_SECONDS = 50;
const MAX_CONCURRENT_TASKS = 8;

const processItem = async (event:ScheduledEventEntity) => {
  logger.info(`Sending scheduled event: ${event.id}`)

  await scheduledEventSender.send(event)

  logger.info(`Sent scheduled event: ${event.id}`)
}

const process = async () => {

  const taskSupplier = new TaskSupplierBuilder<ScheduledEventEntity>()
    .dataName(scheduledEventRepository.collectionName)
    .idMapper(item => item.id)
    .itemRetriever(async (limit:number) => {
      const items = await scheduledEventRetriever.retrieveByTimestampAsc(limit);
      return items.filter(item => item.timestamp && timestampToMoment(item.timestamp).isSameOrBefore(moment()))
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

export const scheduledEventJobProcessor = {
  process,
}