import {JobCallback} from "./ScheduledJobCreator";
import {EventContext, logger} from "firebase-functions";
import {duplicateEntityCleaner} from "../database/duplicate-result-cleaner/DuplicateEntityCleaner";


export const DuplicateResultCleanUpJob:JobCallback = async (context:EventContext|null) => {
  logger.info("Starting duplicate result clean up job");
  await duplicateEntityCleaner.clean(200);
  logger.info("Finished duplicate result clean up job")
  return Promise.resolve();
}