import {userRetriever} from "./UserRetriever";
import {userSessionCreator, userSessionUpdater} from "./UserSessionRepository";
import {PublicUserSessionDto} from "./PublicUserSessionDto";
import {userSessionDtoMapper} from "./UserSessionDtoMapper";
import {userSessionRetriever} from "./UserSessionRetriever";
import moment from "moment/moment";
import {momentToTimestamp, timestampToMoment} from "../../tools/TimeConverter";
import {userUpdater} from "./UserRepository";
import {CallerDetails} from "./UserEndpoints";
import {portfolioRefreshOnUserSessionStartedHandler} from "../portfolio/PortfolioRefreshOnUserSessionStartHandler";

import {mailchimpEventHandler} from "../mailchimp/MailchimpEventHandler";
import {TimestampStatic} from "../../external-lib/Firebase";
import {UtmDetails} from "./UserSessionEntity";
import {queryString} from "../../external-lib/QueryString";
import {userEventCreator} from "./event/UserEventCreator";

export interface StartSessionRequest extends CallerDetails {
  userId:string,
  startPath?:string|null,
  referrer?:string|null,
}

const readQueryParam = (param:string|Array<string>|undefined|null):string|null => {
  if (!param) {
    return null
  }
  if (Array.isArray(param)) {
    if (param.length > 0) {
      return param[0]
    } else {
      return null
    }
  }
  return param;
}

const parseUtmDetails = (query:any):UtmDetails|null => {
  if (!query) {
    return null
  }
  const source = query['utm_source'] ?? null
  const medium = query['utm_medium'] ?? null
  const campaign = query['utm_campaign'] ?? null
  const term = query['utm_term'] ?? null
  const content = query['utm_content'] ?? null

  if (!source && !medium && !campaign && !term && !content) {
    return null
  }
  return {
    source: readQueryParam(source),
    medium: readQueryParam(medium),
    campaign: readQueryParam(campaign),
    term: readQueryParam(term),
    content: readQueryParam(content),
  }
}

const parseAdId = (query:any):string|null => {
  if (!query) {
    return null
  }
  return query['pp_ad_id'] ?? null
}

const start = async (startSession:StartSessionRequest):Promise<PublicUserSessionDto> => {
  const user = await userRetriever.retrieve(startSession.userId);

  const startPath = startSession.startPath ?? null;
  const referrer = startSession.referrer ?? null;
  const paths:Array<string> = []
  let utm:UtmDetails|null = null
  let adId:string|null = null
  if (startPath) {
    paths.push(startPath)
    const query = queryString.parse(new URL(startPath).search)
    utm = parseUtmDetails(query)
    adId = parseAdId(query)
  }
  const numberOfPaths = paths.length

  const session = await userSessionCreator.create({
    mostRecentBeaconReceived: TimestampStatic.now(),
    sessionLengthInSeconds: 0,
    userId: user.id,
    numberOfBeaconsReceived: 1,
    ipAddress: startSession.ipAddress,
    userAgent: startSession.userAgent,
    origin: startSession.origin,
    startPath,
    referrer,
    paths,
    utm,
    numberOfPaths,
    adId,
  });

  let eventDetails:{[key:string]:string|null} = {}
  if (utm) {
    eventDetails = {...utm}
  }
  if (adId) {
    eventDetails['adId'] = adId
  }
  if (startPath) {
    eventDetails['startPath'] = startPath
  }
  if (referrer && referrer.trim().length > 0) {
    eventDetails['referrer'] = referrer
  }

  await Promise.all([
    mailchimpEventHandler.onSessionStarted(user),
    userEventCreator.create({
      userId: user.id,
      sessionId: session.id,
      eventName: "SESSION_STARTED",
      path: startPath,
      eventDetails,
    }),
  ])

  return userSessionDtoMapper.mapPublic(session);
}

export interface BeaconRequest extends StartSessionRequest {
  sessionId:string,
  newPath?:string,
}

const receiveBeacon = async (beacon:BeaconRequest):Promise<PublicUserSessionDto> => {
  const user = await userRetriever.retrieve(beacon.userId);
  const session = await userSessionRetriever.retrieve(beacon.sessionId);
  if (session.userId !== user.id) {
    // if the user and session do not match, create a new session for the user.
    return start(beacon);
  }
  const paths = session.paths ?? []
  if (beacon.newPath) {
    paths.push(beacon.newPath)
  }
  const numberOfPaths = paths.length
  const now = moment();
  const sessionLengthInSeconds = now.diff(timestampToMoment(session.dateCreated), 'seconds');
  const updatedSession = await userSessionUpdater.updateAndReturn(
    session.id,
    {
      numberOfBeaconsReceived: session.numberOfBeaconsReceived + 1,
      sessionLengthInSeconds,
      mostRecentBeaconReceived: momentToTimestamp(now),
      paths,
      numberOfPaths,
    }
  );
  if (user.mostRecentSessionId !== updatedSession.id) {
    await userUpdater.updateOnly(user.id, { mostRecentSessionId: updatedSession.id });
  }

  await portfolioRefreshOnUserSessionStartedHandler.onSessionStarted(user)

  return userSessionDtoMapper.mapPublic(updatedSession);
}

export const userSessionStarter = {
  start,
  receiveBeacon,
}