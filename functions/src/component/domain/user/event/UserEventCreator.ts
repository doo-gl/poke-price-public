import {baseUserEventCreator, UserEventEntity} from "./UserEventEntity";
import {userRetriever} from "../UserRetriever";
import {userSessionRetriever} from "../UserSessionRetriever";
import {NotFoundError} from "../../../error/NotFoundError";
import {InvalidArgumentError} from "../../../error/InvalidArgumentError";
import moment from "moment";
import {userEventRetriever} from "./UserEventRetriever";
import {lodash} from "../../../external-lib/Lodash";
import {userEventTriggerer} from "./triggers/UserEventTriggerer";

const SINCE_SECONDS = 30

export interface CreateUserEventRequest {
  userId:string,
  sessionId:string,
  path:string|null,
  eventName:string,
  eventDetails:{[key:string]:string|string[]|null},
}

const getPreExistingEvent = async (request:CreateUserEventRequest):Promise<UserEventEntity|null> => {
  const since = moment().subtract(SINCE_SECONDS, 'seconds').toDate()
  const matchingEvents = await userEventRetriever.retrieveByUserIdAndSessionIdAndEventNameSinceTimestamp(
    request.userId,
    request.sessionId,
    request.eventName,
    since
  );
  const preExistingEvent = matchingEvents.find(
    event => event.userId === request.userId
      && event.sessionId === request.sessionId
      && event.eventName === request.eventName
      && lodash.isEqual(event.eventDetails, request.eventDetails)
  )
  return preExistingEvent ?? null;
}

const create = async (request:CreateUserEventRequest, options?:{disableTriggers:boolean}):Promise<UserEventEntity> => {
  const user = await userRetriever.retrieve(request.userId)
  const session = await userSessionRetriever.retrieve(request.sessionId)
  if (!user) {
    throw new NotFoundError(`User with id: ${request.userId} not found`)
  }
  if (!session) {
    throw new NotFoundError(`Session with id: ${request.sessionId} not found`)
  }
  if (session.userId !== user.id) {
    throw new InvalidArgumentError(`User: ${user.id} does not own session: ${session.id}`)
  }
  const preExistingEvent = await getPreExistingEvent(request)
  if (preExistingEvent) {
    return preExistingEvent
  }

  const timestamp = new Date()
  const event = await baseUserEventCreator.create({
    userId: request.userId,
    sessionId: request.sessionId,
    path: request.path,
    eventName: request.eventName,
    eventDetails: request.eventDetails,
    timestamp,
  })

  if (!options?.disableTriggers) {
    await userEventTriggerer.listen(event)
  }

  return event
}

export const userEventCreator = {
  create,
}