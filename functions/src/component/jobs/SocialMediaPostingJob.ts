import {JobCallback} from "./ScheduledJobCreator";
import {EventContext, logger} from "firebase-functions";
import {socialMediaPoster} from "../domain/social-media/SocialMediaPoster";
import {SocialMediaPlatform} from "../domain/social-media/SocialMediaPlatform";


export const SocialMediaPostingJob:JobCallback = async (context:EventContext|null) => {
  logger.info("Starting social media posting job");
  // await socialMediaPoster.postToPlatform(SocialMediaPlatform.INSTAGRAM)
  // await socialMediaPoster.postToPlatform(SocialMediaPlatform.FACEBOOK)
  logger.info("Finished social media posting job")
}