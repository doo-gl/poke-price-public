import {UserSessionEntity} from "../UserSessionEntity";
import {UserEntity} from "../UserEntity";
import {UserEventEntity} from "../event/UserEventEntity";
import {userRetriever} from "../UserRetriever";
import {userEventRetriever} from "../event/UserEventRetriever";
import {toInputValueMap, toInputValueMultiMap} from "../../../tools/MapBuilder";


export interface TrackingSession {
  session:UserSessionEntity,
  user:UserEntity,
  events:Array<UserEventEntity>
}

const retrieveForSessions = async (sessions:Array<UserSessionEntity>):Promise<Array<TrackingSession>> => {

  const sessionIds = new Set<string>()
  const userIds = new Set<string>()
  for (let sessionIndex = 0; sessionIndex < sessions.length; sessionIndex++) {
    const session = sessions[sessionIndex]
    userIds.add(session.userId)
    sessionIds.add(session.id)
  }

  const users = await userRetriever.retrieveMany([...userIds])
  const userEvents = await userEventRetriever.retrieveBySessionIds([...sessionIds])
  const userIdToUser = toInputValueMap(users, input => input.id)
  const sessionIdToEvents = toInputValueMultiMap(userEvents, input => input.sessionId)

  const trackingSessions = new Array<TrackingSession>()
  for (let sessionIndex = 0; sessionIndex < sessions.length; sessionIndex++) {
    const session = sessions[sessionIndex]
    const user = userIdToUser.get(session.userId)
    const events = sessionIdToEvents.get(session.id)
    if (!user || !events) {
      continue
    }
    trackingSessions.push({
      session,
      user,
      events,
    })
  }

  return trackingSessions;
}

export const trackingSessionRetriever = {
  retrieveForSessions,
}