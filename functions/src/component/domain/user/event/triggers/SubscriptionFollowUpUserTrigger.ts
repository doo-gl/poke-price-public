import {UserEventTrigger} from "./UserEventTriggerer";
import {UserEventEntity} from "../UserEventEntity";
import {userEventRetriever} from "../UserEventRetriever";
import moment from "moment";
import {userEventCreator} from "../UserEventCreator";
import {mailchimpEventHandler} from "../../../mailchimp/MailchimpEventHandler";
import {userRetriever} from "../../UserRetriever";
import {userMembershipQuerier} from "../../../membership/UserMembershipQuerier";
import {logger} from "firebase-functions";

export const MIN_TIME_BETWEEN_EVENTS_DAYS = 7
export const SUBSCRIPTION_FOLLOW_UP_EVENT_NAME = "SUBSCRIPTION_FOLLOW_UP"

const listen = async (event:UserEventEntity) => {
  if (event.eventName !== "SUBSCRIPTION_VIEW_SHOWN") {
    return;
  }

  const userId = event.userId
  const sessionId = event.sessionId
  const startOfToday = moment().startOf("day").toDate()

  logger.info(`Checking to see if subscription follow up is needed for user: ${userId}`)

  const user = await userRetriever.retrieve(userId)

  if (!user.details?.email) {
    logger.info(`User: ${userId}, has no email, subscription follow up not needed`)
    return
  }

  const mostRecentFollowUpEvent = await userEventRetriever.retrieveMostRecentByEventNameBeforeTimestampForUserId(
    userId,
    SUBSCRIPTION_FOLLOW_UP_EVENT_NAME,
    startOfToday,
    1
  )

  const hasReceivedFollowUpRecently = mostRecentFollowUpEvent.length > 0
    && moment(mostRecentFollowUpEvent[0].timestamp).isAfter(moment().subtract(MIN_TIME_BETWEEN_EVENTS_DAYS, "days"))

  const isPro = userMembershipQuerier.isPokePriceProUser(user)

  if (hasReceivedFollowUpRecently || isPro) {
    logger.info(`User: ${userId}, not sending subscription follow up, hasReceivedFollowUpRecently: ${hasReceivedFollowUpRecently}, isPro: ${isPro}`)
    return;
  }

  logger.info(`Sending subscription follow up for User: ${userId}`)
  await userEventCreator.create({
    path: null,
    eventName: SUBSCRIPTION_FOLLOW_UP_EVENT_NAME,
    userId,
    sessionId,
    eventDetails: {},
  }, {disableTriggers: true})
  await mailchimpEventHandler.onSubscriptionFollowUp(user)
}

export const subscriptionFollowUpUserTrigger:UserEventTrigger = {
  listen,
}