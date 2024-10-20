import {userRetriever} from "../UserRetriever";
import moment from "moment";
import {EventContext, logger} from "firebase-functions";
import {Moment} from "moment/moment";
import {userEventRetriever} from "../event/UserEventRetriever";
import {REACTIVATION_RESET_EVENT_NAME} from "../event/triggers/ReactivationResetTrigger";
import {userUpdater} from "../UserRepository";
import {momentToTimestamp} from "../../../tools/TimeConverter";
import {mailchimpEventHandler} from "../../mailchimp/MailchimpEventHandler";
import {JobCallback} from "../../../jobs/ScheduledJobCreator";

const TIME_BETWEEN_REACTIVATIONS_DAYS = 60

const check = async (limit:number) => {

  const users = await userRetriever.retrieveUsersByNextReactivationAsc(limit)

  await Promise.all(users.map(async user => {

    const mostRecentPageViewEvent = await userEventRetriever.retrieveMostRecentByEventNameBeforeTimestampForUserId(
      user.id,
      REACTIVATION_RESET_EVENT_NAME,
      moment().endOf("day").toDate(),
      1
    )
    const hasRecentlyViewedPage = mostRecentPageViewEvent.length > 0
      && moment(mostRecentPageViewEvent[0].timestamp).isAfter(moment().subtract(TIME_BETWEEN_REACTIVATIONS_DAYS, "days"))

    if (hasRecentlyViewedPage) {
      const nextReactivation = calculateNextReactivationAttempt(mostRecentPageViewEvent.length > 0 ? moment(mostRecentPageViewEvent[0].timestamp) : null)
      logger.info(`User: ${user.id} has activity recently, resetting reactivation, next reactivation: ${nextReactivation.toDate().toISOString()}`)
      await userUpdater.updateOnly(user.id, {
        nextReactivationAttempt: momentToTimestamp(nextReactivation),
      })
    } else {
      logger.info(`Sending reactivation attempt for user: ${user.id}, next reactivation: ${user.nextReactivationAttempt?.toDate().toISOString()}`)
      await userUpdater.updateOnly(user.id, {
        nextReactivationAttempt: momentToTimestamp(calculateNextReactivationAttempt()),
      })
      await mailchimpEventHandler.onReactivationAttempt(user)
    }
  }))
}

const calculateNextReactivationAttempt = (after?:Moment|null):Moment => {
  if (!after) {
    return moment().add(TIME_BETWEEN_REACTIVATIONS_DAYS, "days")
  }
  return after.clone().add(TIME_BETWEEN_REACTIVATIONS_DAYS, "days")
}

export const userReactivationChecker = {
  check,
  calculateNextReactivationAttempt,
}

export const UserReactivationEventJob:JobCallback = async (context:EventContext|null) => {
  logger.info('Starting User Reactivation Event Job')
  await userReactivationChecker.check(1)
  logger.info('Finished User Reactivation Event Job')
  return Promise.resolve();
}

