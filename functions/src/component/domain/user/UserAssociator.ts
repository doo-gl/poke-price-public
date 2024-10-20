import {userRetriever} from "./UserRetriever";
import {logger} from "firebase-functions";
import {userUpdater} from "./UserRepository";
import {UserEntity} from "./UserEntity";
import {userSessionRetriever} from "./UserSessionRetriever";
import {userSessionUpdater} from "./UserSessionRepository";
import {UserSessionEntity} from "./UserSessionEntity";
import {Update} from "../../database/Entity";

const associateSession = async (sessionId:string, anonymousSessionId:string|null):Promise<void> => {
  if (!anonymousSessionId) {
    return;
  }
  const anonymousSession = await userSessionRetriever.retrieveOptional(anonymousSessionId)
  if (!anonymousSession) {
    return;
  }
  const session = await userSessionRetriever.retrieveOptional(sessionId)
  if (!session) {
    return;
  }
  await userSessionUpdater.updateOnly(anonymousSession.id, {toSessionId: session.id})

  const sessionUpdate:Update<UserSessionEntity> = {
    fromSessionId: anonymousSession.id,
    startPath: anonymousSession.startPath ?? null,
    referrer: anonymousSession.referrer ?? null,
  }
  if (anonymousSession.utm) {
    sessionUpdate.utm = {
      source: anonymousSession.utm.source ?? null,
      medium: anonymousSession.utm.medium ?? null,
      campaign: anonymousSession.utm.campaign ?? null,
      content: anonymousSession.utm.content ?? null,
      term: anonymousSession.utm.term ?? null,
    }
  }
  if (anonymousSession.adId) {
    sessionUpdate.adId = anonymousSession.adId
  }
  await userSessionUpdater.updateOnly(session.id, sessionUpdate)
}

const associate = async (userId:string, anonymousUserId:string|null):Promise<void> => {
  if (!anonymousUserId) {
    return;
  }
  const anonymousUser = await userRetriever.retrieveOptional(anonymousUserId);
  if (!anonymousUser) {
    logger.error(`Anonymous user with id: ${anonymousUserId} does not exist, will not be associated with user: ${userId}`);
    return;
  }
  if (anonymousUser.details) {
    logger.error(`Anonymous user with id: ${anonymousUserId} is not anonymous, will not be associated with user: ${userId}`);
    return;
  }
  const user = await userRetriever.retrieve(userId);
  await userUpdater.updateOnly(anonymousUser.id, { parentUserId: user.id });
}

export const userAssociator = {
  associate,
  associateSession,
}