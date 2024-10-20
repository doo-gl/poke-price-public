import {UserSessionEntity} from "./UserSessionEntity";
import {PublicUserSessionDto} from "./PublicUserSessionDto";


const mapPublic = (session:UserSessionEntity):PublicUserSessionDto => {
  return {
    userId: session.userId,
    sessionId: session.id,
  }
}

export const userSessionDtoMapper = {
  mapPublic,
}