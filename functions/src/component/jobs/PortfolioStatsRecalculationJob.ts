import {JobCallback} from "./ScheduledJobCreator";
import {EventContext, logger} from "firebase-functions";
import {portfolioStatsRecalculationJobProcessor} from "../domain/portfolio/PortfolioStatsRecalculationJobProcessor";


export const PortfolioStatsRecalculationJob:JobCallback = async (context:EventContext|null) => {
  logger.info("Starting portfolio stats recalculation job");
  await portfolioStatsRecalculationJobProcessor.process();
  logger.info("Finished portfolio stats recalculation job")
  return Promise.resolve();
}