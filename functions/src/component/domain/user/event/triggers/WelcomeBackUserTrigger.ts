import {UserEventTrigger} from "./UserEventTriggerer";
import {UserEventEntity} from "../UserEventEntity";
import {userEventRetriever} from "../UserEventRetriever";
import moment from "moment";
import {userEventCreator} from "../UserEventCreator";
import {mailchimpEventHandler} from "../../../mailchimp/MailchimpEventHandler";
import {userRetriever} from "../../UserRetriever";
import {logger} from "firebase-functions";

export const MIN_TIME_BETWEEN_EVENTS_DAYS = 60
export const WELCOME_BACK_EVENT_NAME = "WELCOME_BACK"

const listen = async (event:UserEventEntity) => {
  if (event.eventName !== "SESSION_STARTED") {
    return;
  }

  const userId = event.userId
  const sessionId = event.sessionId
  const startOfToday = moment().startOf("day").toDate()

  logger.info(`Checking to see if welcome back is needed for user: ${userId}`)

  const user = await userRetriever.retrieve(userId)

  if (!user.details?.email) {
    logger.info(`User: ${userId}, has no email, welcome back not needed`)
    return
  }

  const mostRecentPageViews = await userEventRetriever.retrieveMostRecentByEventNameBeforeTimestampForUserId(
    userId,
    "PAGE_VIEW",
    startOfToday,
    1
  )
  const mostRecentWelcomeBackEvent = await userEventRetriever.retrieveMostRecentByEventNameBeforeTimestampForUserId(
    userId,
    WELCOME_BACK_EVENT_NAME,
    startOfToday,
    1
  )

  const cutoff = moment().subtract(MIN_TIME_BETWEEN_EVENTS_DAYS, "days")

  const hasBeenOnlineRecently = mostRecentPageViews.length > 0
    && moment(mostRecentPageViews[0].timestamp).isAfter(cutoff)

  const hasReceivedWelcomeBackRecently = mostRecentWelcomeBackEvent.length > 0
    && moment(mostRecentWelcomeBackEvent[0].timestamp).isAfter(cutoff)

  const hasSignedUpRecently = moment(user.dateCreated).isAfter(cutoff)

  if (hasBeenOnlineRecently || hasReceivedWelcomeBackRecently || hasSignedUpRecently) {
    logger.info(`User: ${userId}, not welcome back, hasBeenOnlineRecently: ${hasBeenOnlineRecently}, hasReceivedWelcomeBackRecently: ${hasReceivedWelcomeBackRecently}, hasSignedUpRecently: ${hasSignedUpRecently}`)
    return;
  }

  logger.info(`Sending welcome back for User: ${userId}`)
  await userEventCreator.create({
    path: null,
    eventName: WELCOME_BACK_EVENT_NAME,
    userId,
    sessionId,
    eventDetails: {},
  }, {disableTriggers: true})

  await mailchimpEventHandler.onWelcomeBack(user)
}

export const welcomeBackUserTrigger:UserEventTrigger = {
  listen,
}