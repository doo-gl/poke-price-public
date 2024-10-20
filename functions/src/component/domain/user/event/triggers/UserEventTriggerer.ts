import {UserEventEntity} from "../UserEventEntity";
import {logger} from "firebase-functions";
import {welcomeBackUserTrigger} from "./WelcomeBackUserTrigger";
import {subscriptionFollowUpUserTrigger} from "./SubscriptionFollowUpUserTrigger";
import {reactivationResetTrigger} from "./ReactivationResetTrigger";


export interface UserEventTrigger {
  listen: (event:UserEventEntity) => Promise<void>
}

const TRIGGERS = [
  welcomeBackUserTrigger,
  subscriptionFollowUpUserTrigger,
  reactivationResetTrigger,
]

const listen = async (event:UserEventEntity) => {
  try {
    await Promise.all(TRIGGERS.map(trigger => trigger.listen(event)))
  } catch (err) {
    logger.error(`Failed to run user event trigger: ${err}`, err)
  }
}

export const userEventTriggerer:UserEventTrigger = {
  listen,
}