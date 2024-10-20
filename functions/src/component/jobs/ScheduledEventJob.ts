import {JobCallback} from "./ScheduledJobCreator";
import {EventContext, logger} from "firebase-functions";
import {scheduledEventJobProcessor} from "../event/scheduled/ScheduledEventJobProcessor";


export const ScheduledEventJob:JobCallback = async (context:EventContext|null) => {
  logger.info("Starting Scheduled Event job");
  await scheduledEventJobProcessor.process()
  logger.info("Finished Scheduled Event job")
  return Promise.resolve();
}