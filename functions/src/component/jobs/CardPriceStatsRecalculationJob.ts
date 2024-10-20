// import {JobCallback, ScheduledJob} from "./ScheduledJobCreator";
// import {EventContext, logger} from "firebase-functions";
// import {cardPriceStatsRecalculator} from "../domain/stats/card/CardPriceStatsRecalculator";
// import {cardPriceStatsRecalculationJobProcessor} from "../domain/stats/card/CardPriceStatsRecalculationJobProcessor";
//
//
// export const CardPriceStatsRecalculationJob:JobCallback = async (context:EventContext|null) => {
//   logger.info("Starting card price stats recalculation job");
//   await cardPriceStatsRecalculationJobProcessor.process();
//   logger.info("Finished card price stats recalculation job")
//   return Promise.resolve();
// }