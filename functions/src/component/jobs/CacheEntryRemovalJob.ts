import {JobCallback} from "./ScheduledJobCreator";
import {EventContext, logger} from "firebase-functions";
import {expiredEntryRemover} from "../database/cache/ExpiredEntryRemover";


export const CacheEntryRemovalJob:JobCallback = async (context:EventContext|null) => {
  logger.info("Starting cache entry removal job");
  await expiredEntryRemover.remove();
  logger.info("Finished cache entry removal job")
  return Promise.resolve();
}