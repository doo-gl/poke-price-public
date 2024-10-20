import {JobCallback} from "./ScheduledJobCreator";
import {EventContext, logger} from "firebase-functions";
import {sessionAggregateStatsUpdateProcessor} from "../domain/user/tracking-stats/SessionAggregateStatsUpdateProcessor";


export const SessionAggregateStatsCalculationJob:JobCallback = async (context:EventContext|null) => {
  logger.info("Starting session aggregate stats job");
  // await sessionAggregateStatsUpdateProcessor.processSessionsWithAdIdFromTheLastDay()
  logger.info("Finished session aggregate stats job")
}