import {TrackingSession} from "./TrackingSessionRetriever";
import {SessionStats, sessionStatsCalculator} from "./SessionStatCalculator";

export interface SessionAggregateStats {
  newUsers:number,
  returningUsers:number,
  engagedSessions:number,
  nonEngagedSessions:number,
  bouncedSessions:number,
  uniqueUsers:number,
  uniqueSessions:number,
  registrations:number,
  ebayRedirects:number,
  pageViews:number,
  subscriptions:number,
  avgSessionLengthSecs:number,
  minSessionLengthSecs:number,
  maxSessionLengthSecs:number,
  stdDevSessionLengthSecs:number,
  sessionStats:Array<SessionStats>
}

const calculateLengthStats = (sessionLengthsInSeconds:Array<number>):{avgSessionLengthSecs:number, minSessionLengthSecs:number, maxSessionLengthSecs:number, stdDevSessionLengthSecs:number} => {
  if (sessionLengthsInSeconds.length === 0) {
    return {
      avgSessionLengthSecs: 0,
      minSessionLengthSecs: 0,
      maxSessionLengthSecs: 0,
      stdDevSessionLengthSecs: 0,
    }
  }

  let total = 0
  let min = Number.MAX_SAFE_INTEGER
  let max = Number.MIN_SAFE_INTEGER
  for (let lengthIndex = 0; lengthIndex < sessionLengthsInSeconds.length; lengthIndex++) {
    const length = sessionLengthsInSeconds[lengthIndex]
    total += length
    if (length < min) {
      min = length
    }
    if (length > max) {
      max = length
    }
  }

  const mean = total / sessionLengthsInSeconds.length

  let differenceSquaredSum = 0
  for (let lengthIndex = 0; lengthIndex < sessionLengthsInSeconds.length; lengthIndex++) {
    const length = sessionLengthsInSeconds[lengthIndex]
    differenceSquaredSum += Math.pow(length - mean, 2)
  }
  const stdDev = Math.sqrt(differenceSquaredSum / sessionLengthsInSeconds.length)
  return {
    avgSessionLengthSecs: mean,
    stdDevSessionLengthSecs: stdDev,
    minSessionLengthSecs: min,
    maxSessionLengthSecs: max,
  }
}

const calculateFromSessionStats = (sessionStats:Array<SessionStats>):SessionAggregateStats => {
  const newUserIds = new Set<string>()
  const returningUserIds = new Set<string>()
  const engagedSessionIds = new Set<string>()
  const nonEngagedSessionIds = new Set<string>()
  const bouncedSessionIds = new Set<string>()
  const userIds = new Set<string>()
  const sessionIds = new Set<string>()
  let registrations = 0
  let ebayRedirects = 0
  let pageViews = 0
  let subscriptions = 0
  const sessionLengthsInSeconds = new Array<number>()
  for (let sessionIndex = 0; sessionIndex < sessionStats.length; sessionIndex++) {
    const sessionStat = sessionStats[sessionIndex]

    const userId = sessionStat.userId
    const sessionId = sessionStat.sessionId

    userIds.add(userId)
    sessionIds.add(sessionId)

    if (sessionStat.userType === "new") {
      newUserIds.add(userId)
    }
    if (sessionStat.userType === 'returning') {
      returningUserIds.add(userId)
    }

    if (sessionStat.sessionType === 'engaged') {
      engagedSessionIds.add(sessionId)
    }
    if (sessionStat.sessionType === 'non-engaged') {
      nonEngagedSessionIds.add(sessionId)
    }
    if (sessionStat.sessionType === 'bounce') {
      bouncedSessionIds.add(sessionId)
    }

    registrations += sessionStat.registrations
    ebayRedirects += sessionStat.ebayRedirects
    pageViews += sessionStat.pageViews
    subscriptions += sessionStat.subscriptions

    sessionLengthsInSeconds.push(sessionStat.sessionLengthSecs)
  }

  const lengthStats = calculateLengthStats(sessionLengthsInSeconds)
  return {
    ...lengthStats,
    newUsers: newUserIds.size,
    returningUsers: returningUserIds.size,
    engagedSessions: engagedSessionIds.size,
    nonEngagedSessions: nonEngagedSessionIds.size,
    bouncedSessions: bouncedSessionIds.size,
    uniqueUsers: userIds.size,
    uniqueSessions: sessionIds.size,
    pageViews,
    registrations,
    ebayRedirects,
    subscriptions,
    sessionStats,
  }
}

const calculate = (trackingSessions:Array<TrackingSession>):SessionAggregateStats => {
  const sessionStats = trackingSessions.map(trackingSession => sessionStatsCalculator.calculate(trackingSession))
  return calculateFromSessionStats(sessionStats)
}

export const sessionAggregateStatCalculator = {
  calculate,
  calculateFromSessionStats,
}