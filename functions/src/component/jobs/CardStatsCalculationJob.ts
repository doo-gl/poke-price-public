import {JobCallback} from "./ScheduledJobCreator";
import {EventContext, logger} from "firebase-functions";
import {cardStatsCalculationJobProcessor} from "../domain/stats/card-v2/CardStatsCalculationJobProcessor";


export const CardStatsCalculationJob:JobCallback = async (context:EventContext|null) => {
  logger.info("Starting card stats calculation job");
  await cardStatsCalculationJobProcessor.process();
  logger.info("Finished card stats calculation job")
  return Promise.resolve();
}