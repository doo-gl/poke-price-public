import {JobCallback, ScheduledJob} from "./ScheduledJobCreator";
import {EventContext, logger} from "firebase-functions";
import {setPriceStatsRecalculator} from "../domain/stats/set/SetPriceStatsRecalculator";


export const SetPriceStatsRecalculationJob:JobCallback = async (context:EventContext|null) => {
  logger.info("Starting set price stats recalculation job");
  const result = await setPriceStatsRecalculator.recalculate();
  logger.info(`Recalculated stats for  ${result.length} sets`);
  logger.info("Finished set price stats recalculation job")
  return Promise.resolve();
}