import {UserEntity} from "../UserEntity";
import {userSessionRetriever} from "../UserSessionRetriever";
import {logger} from "firebase-functions";
import {userEventCreator} from "./UserEventCreator";


const onSubscription = async (user:UserEntity):Promise<void> => {
  if (!user.mostRecentSessionId) {
    return
  }
  try {
    const mostRecentSession = await userSessionRetriever.retrieve(user.mostRecentSessionId)
    await userEventCreator.create({
      userId: user.id,
      sessionId: mostRecentSession.id,
      eventName: 'USER_SUBSCRIBED',
      path: null,
      eventDetails: {},
    })
  } catch (err:any) {
    logger.error(`Failed to emit user subscribed event for user: ${user.id}`, err)
  }
}

export const userSubscriptionEventHandler = {
  onSubscription,
}