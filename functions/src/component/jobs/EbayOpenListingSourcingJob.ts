import {JobCallback, ScheduledJob} from "./ScheduledJobCreator";
import {EventContext, logger} from "firebase-functions";
import {ebayOpenListingSourcingJobProcessor} from "../domain/ebay/open-listing/EbayOpenListingSourcingJobProcessor";


export const EbayOpenListingSourcingJob:JobCallback = async (context:EventContext|null) => {
  logger.info("Starting ebay open listing sourcing job");
  // await ebayOpenListingSourcingJobProcessor.process();
  logger.info("Finished open listing sourcing job")
  return Promise.resolve();
}