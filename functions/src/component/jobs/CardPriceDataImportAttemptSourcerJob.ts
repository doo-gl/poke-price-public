import {JobCallback} from "./ScheduledJobCreator";
import {EventContext, logger} from "firebase-functions";
import {cardPriceDataImportAttemptSourcer} from "../domain/card-price-data/CardPriceDataImportAttemptSourcer";


export const CardPriceDataImportAttemptSourcerJob:JobCallback = async (context:EventContext|null) => {
  logger.info("Starting card price data import attempt sourcer job");
  // const result = await cardPriceDataImportAttemptSourcer.source();
  // logger.info(`Sourced ${result.length} attempts to import card price data`);
  logger.info("Finished card price data import attempt sourcer job")
  return Promise.resolve();
}