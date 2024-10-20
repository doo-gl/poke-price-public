import {
  baseEbayRateLimitCreator,
  baseEbayRateLimitUpdater,
  EbayApi,
  EbayApiRateLimitDetails,
  EbayApiRateLimitEntity,
  ebayRateLimitRepository,
  toOptionalEbayApi,
} from "./EbayApiRateLimitEntity";
import {momentToTimestamp, timestampToMoment} from "../../../../tools/TimeConverter";
import moment from "moment";
import {singleResultRepoQuerier} from "../../../../database/SingleResultRepoQuerier";
import {Timestamp, TimestampStatic} from "../../../../external-lib/Firebase";
import {ebayApiClient} from "../EbayApiClient";
import {EbayAppRateLimitResponse} from "../EbayApiClientTypes";
import {Create, Update} from "../../../../database/Entity";
import {logger} from "firebase-functions";


const LOCAL_API_CALL_TRACKER = new Map<EbayApi, number>()

const today = ():Timestamp => {
  return momentToTimestamp(moment.utc().startOf('day'))
}

const shouldSyncRateLimit = (rateLimitEntity:EbayApiRateLimitEntity):boolean => {
  return timestampToMoment(rateLimitEntity.lastUpdatedAt).isBefore(moment.utc().subtract(30, 'minute'))
}

const retrieveOptionalRate = async ():Promise<EbayApiRateLimitEntity|null> => {
  const result = await singleResultRepoQuerier.query(
    ebayRateLimitRepository,
    [{name: "timestamp", value: today()}],
    ebayRateLimitRepository.collectionName
  )
  return result
}

const mapRateLimitResponseToDetails = (response:EbayAppRateLimitResponse):Array<EbayApiRateLimitDetails> => {
  const details = new Array<EbayApiRateLimitDetails>()
  response?.rateLimits?.forEach(rateLimit => {
    const apiContext = rateLimit.apiContext
    rateLimit?.resources?.forEach(resource => {
      const apiResourceName = resource.name
      const rate = resource.rates?.find(() => true) ?? null
      const api = toOptionalEbayApi({apiContext, apiResourceName})
      if (!api) {
        return
      }
      logger.info(`Ebay api rate: ${JSON.stringify(rate)}`)
      details.push({
        api,
        apiContext,
        apiResourceName,
        limitRanOutAt: null,
        estimatedUsageSinceUpdate: 0,
        estimatedUsageRemaining: rate?.remaining ?? 0,
        dailyLimit: rate?.limit ?? 0,
        dailyLimitRemaining: rate?.remaining ?? 0,
        limitResetsAt: rate?.reset ? momentToTimestamp(moment.utc(rate.reset)) : momentToTimestamp(moment.utc().endOf('day')),
        limitLastUpdatedAt: TimestampStatic.now(),
      })
    })
  })
  return details
}

const createTodaysRateLimit = async ():Promise<EbayApiRateLimitEntity> => {
  const apiResponse = await ebayApiClient.getAppRateLimits()
  const details = mapRateLimitResponseToDetails(apiResponse)
  const create:Create<EbayApiRateLimitEntity> = {
    timestamp: today(),
    lastUpdatedAt: TimestampStatic.now(),
    rateLimits: details,
  }
  const result = await baseEbayRateLimitCreator.create(create)
  return result
}

const retrieveCurrentRateLimits = async ():Promise<EbayApiRateLimitEntity> => {
  const todaysRateLimit = await retrieveOptionalRate()
  if (!todaysRateLimit) {
    return await createTodaysRateLimit()
  } else if (shouldSyncRateLimit(todaysRateLimit)) {
    return await syncRateLimitAgainstApi(todaysRateLimit)
  }
  return todaysRateLimit
}

const getApiRateLimit = async (api:EbayApi):Promise<EbayApiRateLimitDetails|null> => {
  const rateLimits = await retrieveCurrentRateLimits()
  return rateLimits.rateLimits.find(rateLimit => rateLimit.api === api) ?? null
}

const sync = async ():Promise<void> => {
  logger.info(`Syncing ebay api rate limit`)
  const rateLimit = await retrieveCurrentRateLimits()
  await syncRateLimitAgainstApi(rateLimit)
}
const syncRateLimitAgainstApi = async (rateLimit:EbayApiRateLimitEntity):Promise<EbayApiRateLimitEntity> => {
  if (!shouldSyncRateLimit(rateLimit)) {
    return rateLimit
  }
  const apiResponse = await ebayApiClient.getAppRateLimits({idempotencyKey: `SYNC__${moment().format("YYYY-MM-DD-HH-mm")}`})
  const details = mapRateLimitResponseToDetails(apiResponse)
  const update:Update<EbayApiRateLimitEntity> = {
    lastUpdatedAt: TimestampStatic.now(),
    rateLimits: details,
  }
  return await baseEbayRateLimitUpdater.updateAndReturn(rateLimit.id, update)
}

const trackApiCalls = async (api:EbayApi, newCalls:number):Promise<void> => {
  let count = LOCAL_API_CALL_TRACKER.get(api) ?? 0
  count += newCalls
  LOCAL_API_CALL_TRACKER.set(api, count)
}

const mapAdditionalCalls = (rateLimits:Array<EbayApiRateLimitDetails>, trackedCalls:Map<EbayApi, number>):Array<EbayApiRateLimitDetails> => {
  return rateLimits?.map(rateLimit => {
    const api = rateLimit.api
    const additionalCalls = trackedCalls.get(api) ?? null
    if (additionalCalls === null) {
      return rateLimit
    }
    const estimatedUsageSinceUpdate = rateLimit.estimatedUsageSinceUpdate + additionalCalls
    const estimatedUsageRemaining = Math.max(0, rateLimit.dailyLimitRemaining - estimatedUsageSinceUpdate)
    return {
      ...rateLimit,
      estimatedUsageSinceUpdate,
      estimatedUsageRemaining,
    }
  }) ?? []
}

const flush = async ():Promise<void> => {
  const currentRateLimits = await retrieveCurrentRateLimits()
  const trackedCalls = new Map<EbayApi, number>()
  const logCallObject:any = {}
  LOCAL_API_CALL_TRACKER.forEach((value, key) => {
    trackedCalls.set(key, value)
    logCallObject[key] = value
  })
  logger.info(`Flushing additional ebay api calls to DB: ${JSON.stringify(logCallObject)}`)
  await ebayRateLimitRepository.getFirestoreDatabase().runTransaction(async transaction => {
    const collectionRef = ebayRateLimitRepository.getFirebaseCollection()
    const docRef = collectionRef.doc(currentRateLimits.id)
    const doc = await transaction.get(docRef)
    const entity = ebayRateLimitRepository.convert(doc.data())
    if (!entity) {
      return
    }

    if (!entity.rateLimits) {
      logger.warn(`Ebay api entity without rate limit: ${JSON.stringify(entity)}`)
    }
    const newRateLimits = mapAdditionalCalls(entity.rateLimits, trackedCalls)

    const update:Update<EbayApiRateLimitEntity> = {
      rateLimits: newRateLimits,
    }

    await transaction.update(docRef, update)
  })
  LOCAL_API_CALL_TRACKER.clear()
}

const onTooManyRequestsError = async (api:EbayApi):Promise<void> => {
  const rateLimitEntity = await retrieveCurrentRateLimits()
  const details:Array<EbayApiRateLimitDetails> = rateLimitEntity.rateLimits.map(rateLimit => {
    if (rateLimit.api === api) {
      return {
        ...rateLimit,
        dailyLimitRemaining: 0,
        estimatedUsageRemaining: 0,
      }
    }
    return rateLimit
  })
  const update:Update<EbayApiRateLimitEntity> = {
    rateLimits: details,
  }
  logger.info(`Too many ebay api requests, setting limit remaining to 0`)
  await baseEbayRateLimitUpdater.updateOnly(rateLimitEntity.id, update)
}


const canApiBeCalled = async (api:EbayApi):Promise<boolean> => {
  const rateLimitEntity = await retrieveCurrentRateLimits()
  const rateLimit = rateLimitEntity.rateLimits.find(rl => rl.api === api)
  if (!rateLimit) {
    return false
  }
  const estimateRemaining = rateLimit.estimatedUsageRemaining - (LOCAL_API_CALL_TRACKER.get(api) ?? 0)
  logger.info(`Ebay Api calls remaining: ${rateLimit.dailyLimitRemaining}, estimated remaining: ${estimateRemaining}`)
  return rateLimit.dailyLimitRemaining > 0 && estimateRemaining > 0
}

export const ebayApiRateLimitQuerier = {
  canApiBeCalled,
  onTooManyRequestsError,
  flush,
  trackApiCalls,
  sync,
}