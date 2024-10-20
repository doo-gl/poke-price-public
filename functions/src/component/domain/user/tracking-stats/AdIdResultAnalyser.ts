import {sessionAggregateStatCalculator, SessionAggregateStats} from "./SessionAggregateStatCalculator";
import {userSessionRetriever} from "../UserSessionRetriever";
import {trackingSessionRetriever} from "./TrackingSessionRetriever";


const analyse = async (adId:string):Promise<SessionAggregateStats> => {
  const sessions = await userSessionRetriever.retrieveByAdId(adId)
  const trackingSessions = await trackingSessionRetriever.retrieveForSessions(sessions)
  const stats = sessionAggregateStatCalculator.calculate(trackingSessions)
  return stats
}

export const adIdResultAnalyser = {
  analyse,
}