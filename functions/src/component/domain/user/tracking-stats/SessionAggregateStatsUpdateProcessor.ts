import {UserSessionEntity} from "../UserSessionEntity";
import {userSessionRetriever} from "../UserSessionRetriever";
import moment from "moment/moment";
import {toSet} from "../../../tools/SetBuilder";
import {
  buildGroupingKey,
  SessionAggregateStatsEntity,
  sessionAggregateStatsRepository,
} from "./SessionAggregateStatsEntity";
import {sessionAggregateStatsRetriever} from "./SessionAggregateStatsRetriever";
import {toInputValueMap} from "../../../tools/MapBuilder";
import {timestampToMoment} from "../../../tools/TimeConverter";
import {SessionStats, sessionStatsCalculator} from "./SessionStatCalculator";
import {trackingSessionRetriever} from "./TrackingSessionRetriever";
import {BatchUpdate, Create} from "../../../database/mongo/MongoEntity";
import {sessionAggregateStatCalculator} from "./SessionAggregateStatCalculator";
import {comparatorBuilder} from "../../../infrastructure/ComparatorBuilder";
import {logger} from "firebase-functions";

const buildAdIdGroupingKey = (adId:string):string => {
  return buildGroupingKey([{key: 'adId', value: adId}])
}

const mapToGroupingKeys = (sessions:Array<UserSessionEntity>):Array<string> => {
  const adIds = new Array<string>()
  sessions.forEach(session => {
    if (session.adId) {
      adIds.push(session.adId)
    }
  })
  const uniqueAdIds = toSet(adIds, i => i)
  return [...uniqueAdIds].map(adId => buildAdIdGroupingKey(adId))
}

const findRecentSessionsToCalculateStatsFor = (recentSessions:Array<UserSessionEntity>, groupingKeyToStats:Map<string,SessionAggregateStatsEntity>):Map<string,Array<UserSessionEntity>> => {

  const sessionsToCalculateFor = new Map<string, Array<UserSessionEntity>>()

  const addSession = (groupingKey:string, session:UserSessionEntity) => {
    const sessions = sessionsToCalculateFor.get(groupingKey) ?? []
    sessions.push(session)
    sessionsToCalculateFor.set(groupingKey, sessions)
  }

  recentSessions.forEach(session => {
    if (!session.adId) {
      return
    }
    const groupingKey = buildAdIdGroupingKey(session.adId)
    const stats = groupingKeyToStats.get(groupingKey)
    if (!stats) {
      addSession(groupingKey, session)
      return
    }

    // if the stats for this session have not been calculated before
    const sessionStats = stats.sessions.find(sessionStat => sessionStat.sessionId === session.id) ?? null
    if (!sessionStats) {
      addSession(groupingKey, session)
      return;
    }

    // or the session continued after the stats were calculated
    const sessionStatsNeedUpdate = timestampToMoment(session.mostRecentBeaconReceived).isAfter(moment(sessionStats.lastCalculated))
    if (sessionStatsNeedUpdate) {
      addSession(groupingKey, session)
    }
  })

  return sessionsToCalculateFor
}

const calculateStatsForSessions = async (groupingKeyToSessions:Map<string, Array<UserSessionEntity>>):Promise<Map<string, Array<SessionStats>>> => {
  const groupingKeyToSessionStats = new Map<string, Array<SessionStats>>()

  await Promise.all([...groupingKeyToSessions.entries()].map(async entry => {
    const groupingKey = entry[0]
    const sessions = entry[1]
    const trackingSessions = await trackingSessionRetriever.retrieveForSessions(sessions)
    const sessionStats = trackingSessions.map(trackingSession => sessionStatsCalculator.calculate(trackingSession))
    groupingKeyToSessionStats.set(groupingKey, sessionStats)
  }))

  return groupingKeyToSessionStats
}

const calculateAggregateStatCreates = (groupingKeyToAggregateStats:Map<string, SessionAggregateStatsEntity>, groupingKeyToSessionStats:Map<string, Array<SessionStats>>):Array<Create<SessionAggregateStatsEntity>> => {
  const creates = new Array<Create<SessionAggregateStatsEntity>>()

  groupingKeyToSessionStats.forEach((sessions, groupingKey) => {
    const aggregateStats = groupingKeyToAggregateStats.get(groupingKey)
    if (aggregateStats) {
      // stats already exist for this grouping key, so do not create new
      return
    }
    sessions.sort(comparatorBuilder.combineAll(
      comparatorBuilder.objectAttributeASC(val => val.lastCalculated),
      comparatorBuilder.objectAttributeASC(val => val.sessionId),
    ))
    const newStats = sessionAggregateStatCalculator.calculateFromSessionStats(sessions)
    const {
      sessionStats,
      ...newStatsWithoutSessionStats
    } = newStats
    creates.push({
      groupingKey,
      sessions: sessionStats,
      lastCalculated: new Date(),
      stats: newStatsWithoutSessionStats,
    })
  })

  return creates
}

const calculateAggregateStatUpdates = (groupingKeyToAggregateStats:Map<string, SessionAggregateStatsEntity>, groupingKeyToSessionStats:Map<string, Array<SessionStats>>):Array<BatchUpdate<SessionAggregateStatsEntity>> => {
  const updates = new Array<BatchUpdate<SessionAggregateStatsEntity>>()

  groupingKeyToSessionStats.forEach((newSessionStats, groupingKey) => {
    const aggregateStats = groupingKeyToAggregateStats.get(groupingKey)
    if (!aggregateStats) {
      // stats do not exist so nothing to update
      return
    }
    // combine the newly calculated session stats with the ones from the aggregate stats
    // if there are 2 stats for the same session, take the new stats with priority over the old
    const previousSessionStats = aggregateStats.sessions
    const sessionIdToSessionStatsToCalculateFor = new Map<string,SessionStats>()
    newSessionStats.forEach(sessionStat => sessionIdToSessionStatsToCalculateFor.set(sessionStat.sessionId, sessionStat))
    previousSessionStats.forEach(sessionStat => {
      if (!sessionIdToSessionStatsToCalculateFor.has(sessionStat.sessionId)) {
        sessionIdToSessionStatsToCalculateFor.set(sessionStat.sessionId, sessionStat)
      }
    })
    const combinedSessionStats = [...sessionIdToSessionStatsToCalculateFor.values()]
    combinedSessionStats.sort(comparatorBuilder.combineAll(
      comparatorBuilder.objectAttributeASC(val => val.lastCalculated),
      comparatorBuilder.objectAttributeASC(val => val.sessionId),
    ))
    const newStats = sessionAggregateStatCalculator.calculateFromSessionStats(combinedSessionStats)
    const {
      sessionStats,
      ...newStatsWithoutSessionStats
    } = newStats
    updates.push({
      id: aggregateStats._id,
      update: {
        lastCalculated: new Date(),
        stats: newStatsWithoutSessionStats,
        sessions: sessionStats,
      },
    })
  })

  return updates
}

const processSessions = async (sessionsToProcess:Array<UserSessionEntity>) => {
  // extract the grouping keys for the sessions
  const groupingKeys = mapToGroupingKeys(sessionsToProcess)

  // find the aggregate stats for those grouping keys
  const preExistingAggregateStats = await sessionAggregateStatsRetriever.retrieveByGroupingKeys(groupingKeys)
  const groupingKeyToStats = toInputValueMap(preExistingAggregateStats, val => val.groupingKey)

  // decide which of the sessions need to be calculated for
  // - sessions that are not included in aggregate stats
  // - sessions for which there is no aggregate stats
  // - sessions which have been updated after the last time it's stats were calculated
  const sessionsToCalculateStatsFor = findRecentSessionsToCalculateStatsFor(sessionsToProcess, groupingKeyToStats)
  logger.info(`There are ${sessionsToCalculateStatsFor.size} aggregate stats to be updated / created`)

  // given the sessions, go find their events and calculate their stats
  const groupingKeyToSessionStats = await calculateStatsForSessions(sessionsToCalculateStatsFor)

  // given the newly calculated stats, decide how to create / update in the db
  const aggregateStatCreates = calculateAggregateStatCreates(groupingKeyToStats, groupingKeyToSessionStats)
  const aggregateStatUpdates = calculateAggregateStatUpdates(groupingKeyToStats, groupingKeyToSessionStats)

  await sessionAggregateStatsRepository.batchCreate(aggregateStatCreates)
  await sessionAggregateStatsRepository.batchUpdate(aggregateStatUpdates)
}

const processSessionsWithAdIdFromTheLastDay = async () => {
  const recentSessions = await userSessionRetriever.retrieveAfterDateWithNonNullAdId(moment().subtract(1, 'day'))
  logger.info(`Found ${recentSessions} sessions from the last 24 hours with an Ad Id`)
  await processSessions(recentSessions)
}

export const sessionAggregateStatsUpdateProcessor = {
  processSessionsWithAdIdFromTheLastDay,
  processSessions,
}