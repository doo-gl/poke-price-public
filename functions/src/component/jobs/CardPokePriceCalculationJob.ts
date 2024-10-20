import {JobCallback} from "./ScheduledJobCreator";
import {EventContext, logger} from "firebase-functions";
import {cardPokePriceCalculationJobProcessor} from "../domain/stats/card-v2/CardPokePriceCalculationJobProcessor";


export const CardPokePriceCalculationJob:JobCallback = async (context:EventContext|null) => {
  logger.info("Starting card poke price calculation job");
  await cardPokePriceCalculationJobProcessor.process();
  logger.info("Finished card poke price calculation job")
  return Promise.resolve();
}