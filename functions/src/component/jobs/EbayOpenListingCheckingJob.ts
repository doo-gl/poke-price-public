import {JobCallback} from "./ScheduledJobCreator";
import {EventContext, logger} from "firebase-functions";
import {ebayOpenListingCheckingJobProcessor} from "../domain/ebay/open-listing/EbayOpenListingCheckingJobProcessor";


export const EbayOpenListingCheckingJob:JobCallback = async (context:EventContext|null) => {
  logger.info("Starting ebay open listing checking job");
  // await ebayOpenListingCheckingJobProcessor.process();
  logger.info("Finished open listing checking job")
  return Promise.resolve();
}