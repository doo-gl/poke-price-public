import {JobCallback} from "./ScheduledJobCreator";
import {EventContext, logger} from "firebase-functions";
import {
  leastRecentlyUpdatedListingUpdateJobProcessor,
} from "../domain/marketplace/LeastRecentlyUpdatedListingUpdateJobProcessor";


export const LeastRecentlyUpdatedListingUpdateJob:JobCallback = async (context:EventContext|null) => {
  logger.info("Starting least recently updated listing update job");
  await leastRecentlyUpdatedListingUpdateJobProcessor.process();
  logger.info("Finished least recently updated listing update  job")
  return Promise.resolve();
}