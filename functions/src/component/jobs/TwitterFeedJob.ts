import {JobCallback} from "./ScheduledJobCreator";
import {EventContext, logger} from "firebase-functions";
import {interestingListingTweeter} from "../domain/social-media/twitter/InterestingListingTweeter";

export const TwitterFeedJob:JobCallback = async (context:EventContext|null) => {
  logger.info("Starting twitter feed job job");
  // await interestingListingTweeter.tweet()
  logger.info("Finished twitter feed job job")
  return Promise.resolve();
}