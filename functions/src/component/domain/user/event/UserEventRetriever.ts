import {UserEventEntity, userEventRepository} from "./UserEventEntity";


const retrieveByUserIdAndSessionIdAndEventNameSinceTimestamp = (userId:string, sessionId:string, eventName:string, since:Date):Promise<Array<UserEventEntity>> => {
  return userEventRepository.getMany(
    {
      userId,
      sessionId,
      eventName,
      timestamp: {$gte: since},
    },
    {
      sort: ["timestamp", -1],
    }
  )
}

const retrieveByUserIdSinceTimestamp = (userId:string, since:Date):Promise<Array<UserEventEntity>> => {
  return userEventRepository.getMany(
    {
      userId,
      timestamp: {$gte: since},
    },
    {
      sort: ["timestamp", -1],
    }
  )
}

const retrieveMostRecentByEventNameBeforeTimestampForUserId = (userId:string, eventName:string, before:Date, limit:number):Promise<Array<UserEventEntity>> => {
  return userEventRepository.getMany(
    {
      userId,
      eventName,
      timestamp: {$lte: before},
    },
    {
      sort: ["timestamp", -1],
      limit,
    }
  )
}

const retrieveBySessionIds = (sessionIds:Array<string>):Promise<Array<UserEventEntity>> => {
  return userEventRepository.getMany({
    sessionId: {$in: sessionIds},
  })
}

export const userEventRetriever = {
  retrieveBySessionIds,
  retrieveByUserIdAndSessionIdAndEventNameSinceTimestamp,
  retrieveMostRecentByEventNameBeforeTimestampForUserId,
  retrieveByUserIdSinceTimestamp,
}