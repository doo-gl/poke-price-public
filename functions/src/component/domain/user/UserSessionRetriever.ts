import {UserSessionEntity} from "./UserSessionEntity";
import {byIdRetriever} from "../../database/ByIdRetriever";
import {userSessionRepository} from "./UserSessionRepository";
import {Moment} from "moment";
import {momentToTimestamp} from "../../tools/TimeConverter";


const retrieve = (id:string):Promise<UserSessionEntity> => {
  return byIdRetriever.retrieve(userSessionRepository, id, userSessionRepository.collectionName);
}

const retrieveOptional = (id:string):Promise<UserSessionEntity|null> => {
  return userSessionRepository.getOne(id)
}

const retrieveByUserId = (userId:string):Promise<Array<UserSessionEntity>> => {
  return userSessionRepository.getMany([
    { field: "userId", operation: "==", value: userId },
  ])
}

const retrieveByAdId = (adId:string):Promise<Array<UserSessionEntity>> => {
  return userSessionRepository.getMany([
    { field: "adId", operation: "==", value: adId },
  ])
}

const retrieveAfterDateWithNonNullAdId = async (after:Moment):Promise<Array<UserSessionEntity>> => {
  const sessions = await userSessionRepository.getMany([
    { field: "mostRecentBeaconReceived", operation: ">=", value: momentToTimestamp(after) },
  ])
  return sessions.filter(session => !!session.adId)
}

export const userSessionRetriever = {
  retrieve,
  retrieveOptional,
  retrieveByUserId,
  retrieveByAdId,
  retrieveAfterDateWithNonNullAdId,
}