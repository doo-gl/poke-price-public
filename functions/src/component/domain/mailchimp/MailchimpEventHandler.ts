import {UserEntity} from "../user/UserEntity";
import {logger} from "firebase-functions";
import {mailchimpMarketing} from "../../external-lib/Mailchimp";
import {isProduction} from "../../infrastructure/ProductionDecider";
import {UserEventEntity} from "../user/event/UserEventEntity";
import {mailchimpContactAdder} from "./MailchimpContactAdder";



const onEvent = async (user:UserEntity, eventName:string, event:any):Promise<void> => {
  try {
    if (!isProduction()) {
      logger.info(`Not production so not sending ${eventName} for user ${user.id} to mailchimp`)
      return
    }
    const email = user.details?.email
    if (!email || !email.includes('@')) {
      logger.info(`Not a valid email so not sending ${eventName} for user ${user.id} to mailchimp`)
      return;
    }
    const member = await mailchimpContactAdder.getOrAddContact(user)
    if (!member) {
      logger.info(`Email not in mailchimp so not sending ${eventName} for user ${user.id} to mailchimp`)
      return
    }
    logger.info(`Sending ${eventName} for user ${user.id} to mailchimp`)
    await mailchimpMarketing.sendListMemberEvent(email, eventName, event)
  } catch (err:any) {
    logger.error(`Failed to send mailchimp event: ${eventName}, for user: ${user.id}`)
  }
}

const onSessionStarted = async (user:UserEntity) => {
  await onEvent(
    user,
    'session_started',
    {},
  )
}

const onSubscription = async (user:UserEntity) => {
  await onEvent(
    user,
    'user_subscribed',
    {  },
  )
}

const onSubscriptionEnded = async (user:UserEntity) => {
  await onEvent(
    user,
    'user_subscription_ended',
    {  },
  )
}

const onFirstInventoryItemAdded = async (user:UserEntity) => {
  await onEvent(
    user,
    'first_inventory_item_added',
    {},
  )
}

const onSubscriptionFollowUp = async (user:UserEntity) => {
  await onEvent(
    user,
    'subscription_follow_up',
    {},
  )
}

const onWelcomeBack = async (user:UserEntity) => {
  await onEvent(
    user,
    'welcome_back',
    {},
  )
}

const onReactivationAttempt = async (user:UserEntity) => {
  await onEvent(
    user,
    'reactivation_attempt',
    {},
  )
}

export const mailchimpEventHandler = {
  onSessionStarted,
  onSubscription,
  onSubscriptionEnded,
  onFirstInventoryItemAdded,
  onWelcomeBack,
  onReactivationAttempt,
  onSubscriptionFollowUp,
}