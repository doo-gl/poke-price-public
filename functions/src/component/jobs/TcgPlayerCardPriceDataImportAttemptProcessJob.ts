import {JobCallback, ScheduledJob} from "./ScheduledJobCreator";
import {EventContext, logger} from "firebase-functions";
import {cardPriceDataImportAttemptProcessor} from "../domain/card-price-data/CardPriceDataImportAttemptProcessor";
import {ImportType} from "../domain/card-price-data/CardPriceDataImportAttemptEntity";

export const TcgPlayerCardPriceDataImportAttemptProcessJob:JobCallback = async (context:EventContext|null) => {
  logger.info("Starting ebay card price data import attempt process job");
  // const result = await cardPriceDataImportAttemptProcessor.process(
  //   ImportType.TCG_PLAYER_MARKET_DATA,
  // );
  // logger.info(`Processed ${result.length} attempts to import card price data.`)
  logger.info("Finished card price data import attempt process job")
  return Promise.resolve();
}