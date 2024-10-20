import {EntityDto} from "../EntityDto";
import {Entity} from "../../database/Entity";
import {timestampToMoment} from "../../tools/TimeConverter";
import {UserSessionEntity} from "./UserSessionEntity";
import {Moment} from "moment";

export interface AdminUserSessionDto extends EntityDto, Omit<UserSessionEntity, keyof Entity|"mostRecentBeaconReceived"> {
  mostRecentBeaconReceived:Moment
}

const map = (session:UserSessionEntity):AdminUserSessionDto => {
  const {
    id,
    dateCreated,
    dateLastModified,
    mostRecentBeaconReceived,
    ...dto
  } = session
  return {
    ...dto,
    id: session.id,
    dateCreated: timestampToMoment(dateCreated),
    dateLastModified: timestampToMoment(dateLastModified),
    mostRecentBeaconReceived: timestampToMoment(mostRecentBeaconReceived),
  }
}

export const adminUserSessionMapper = {
  map,
}