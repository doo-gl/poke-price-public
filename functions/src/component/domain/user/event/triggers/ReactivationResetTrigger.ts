import {UserEventTrigger} from "./UserEventTriggerer";
import {UserEventEntity} from "../UserEventEntity";
import moment from "moment";
import {userRetriever} from "../../UserRetriever";
import {userEventRetriever} from "../UserEventRetriever";
import {userEventCreator} from "../UserEventCreator";
import {userUpdater} from "../../UserRepository";
import {userReactivationChecker} from "../../reactivate/UserReactivationChecker";
import {momentToTimestamp} from "../../../../tools/TimeConverter";
import {logger} from "firebase-functions";

export const MIN_TIME_BETWEEN_EVENTS_DAYS = 1
export const REACTIVATION_RESET_EVENT_NAME = "REACTIVATION_RESET"

const listen = async (event:UserEventEntity) => {
  if (event.eventName !== "SESSION_STARTED") {
    return;
  }


  const userId = event.userId
  const sessionId = event.sessionId
  const endOfDay = moment().endOf("day").toDate()

  logger.info(`Checking to see if reactivation needs to be reset for user: ${userId}`)

  const user = await userRetriever.retrieve(userId)

  if (!user.details?.email) {
    logger.info(`User: ${userId}, has no email, no reactivation possible`)
    return
  }

  const mostRecentReactivationResetEvent = await userEventRetriever.retrieveMostRecentByEventNameBeforeTimestampForUserId(
    userId,
    REACTIVATION_RESET_EVENT_NAME,
    endOfDay,
    1
  )

  const hasResetReactivationRecently = mostRecentReactivationResetEvent.length > 0
    && moment(mostRecentReactivationResetEvent[0].timestamp).isAfter(moment().subtract(MIN_TIME_BETWEEN_EVENTS_DAYS, "days"))

  if (hasResetReactivationRecently) {
    logger.info(`User: ${userId}, has reset reactivation recently, not going to reset again`)
    return;
  }


  const nextReactivation = userReactivationChecker.calculateNextReactivationAttempt()
  logger.info(`Resetting Reactivation for User: ${userId}, to ${nextReactivation.toISOString()}`)
  await userEventCreator.create({
    path: null,
    eventName: REACTIVATION_RESET_EVENT_NAME,
    userId,
    sessionId,
    eventDetails: {nextReactivation: nextReactivation.toISOString()},
  }, {disableTriggers: true})
  await userUpdater.updateOnly(userId, {
    nextReactivationAttempt: momentToTimestamp(nextReactivation),
  })
}

export const reactivationResetTrigger:UserEventTrigger = {
  listen,
}