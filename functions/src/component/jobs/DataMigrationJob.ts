import {JobCallback} from "./ScheduledJobCreator";
import {EventContext, logger} from "firebase-functions";
import {dataMigrator} from "../database/migration/DataMigrator";


export const DataMigrationJob:JobCallback = async (context:EventContext|null) => {
  logger.info("Starting data migration job");
  await dataMigrator.migrate()
  logger.info("Finished data migration job")
  return Promise.resolve();
}