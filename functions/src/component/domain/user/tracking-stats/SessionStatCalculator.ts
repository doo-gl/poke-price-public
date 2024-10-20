import {TrackingSession} from "./TrackingSessionRetriever";
import {timestampToMoment} from "../../../tools/TimeConverter";


export interface SessionStats {
  sessionId:string,
  userId:string,
  lastCalculated:Date,
  userType:'new'|'returning',
  sessionType:'engaged'|'non-engaged'|'bounce',
  registrations:number,
  ebayRedirects:number,
  pageViews:number,
  subscriptions:number,
  sessionLengthSecs:number,
}

const calculateUserType = (trackingSession:TrackingSession):'new'|'returning' => {
  const sessionStart = timestampToMoment(trackingSession.session.dateCreated)
  const userCreated = timestampToMoment(trackingSession.user.dateCreated)
  const lowerBound = sessionStart.clone().subtract(5, 'minutes')
  const upperBound = sessionStart.clone().add(5, 'minutes')
  const isUserCreatedCloseToSession = userCreated.isBetween(lowerBound, upperBound)
  return isUserCreatedCloseToSession ? 'new' : 'returning'
}

const calculateSessionType = (trackingSession:TrackingSession):'engaged'|'non-engaged'|'bounce' => {
  // bounce if the session is less than 30sec
  // non-engaged if the session is >30sec but one path
  // else engaged
  if (trackingSession.session.sessionLengthInSeconds <= 30) {
    return 'bounce'
  }
  if (trackingSession.session.sessionLengthInSeconds > 30 && (trackingSession.session.paths?.length ?? 0) === 1) {2
    return 'non-engaged'
  }
  return 'engaged'
}

const calculate = (trackingSession:TrackingSession):SessionStats => {
  const userType = calculateUserType(trackingSession)
  const sessionType = calculateSessionType(trackingSession)
  let registrations = 0
  let ebayRedirects = 0
  let pageViews = 0
  let subscriptions = 0
  const sessionLengthSecs = trackingSession.session.sessionLengthInSeconds
  for (let eventIndex = 0; eventIndex < trackingSession.events.length; eventIndex++) {
    const event = trackingSession.events[eventIndex]
    if (event.eventName === 'SIGN_UP') {
      registrations++
    }
    if (event.eventName === 'REDIRECT_TO_EBAY') {
      ebayRedirects++
    }
    if (event.eventName === 'PAGE_VIEW') {
      pageViews++
    }
    if (event.eventName === 'USER_SUBSCRIBED') {
      subscriptions++
    }
  }
  return {
    userId: trackingSession.user.id,
    sessionId: trackingSession.session.id,
    lastCalculated: new Date(),
    userType,
    sessionType,
    sessionLengthSecs,
    ebayRedirects,
    registrations,
    subscriptions,
    pageViews,
  }
}

export const sessionStatsCalculator = {
  calculate,
}