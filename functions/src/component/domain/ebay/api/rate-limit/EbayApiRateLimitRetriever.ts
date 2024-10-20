import {EbayAppRateLimit, EbayAppRateLimitRate, EbayAppRateLimitResource} from "../EbayApiClientTypes";
import {ebayApiClient} from "../EbayApiClient";
import {logger} from "firebase-functions";
import moment, {Moment} from "moment";
import {timeDifferenceCalculator, TimeUnit} from "../../../../tools/TimeDifferenceCalculator";
import {EbayApi, toEbayApiIdentifier} from "./EbayApiRateLimitEntity";


const retrieveRateLimit = async (api:EbayApi):Promise<EbayAppRateLimit|null> => {
  const identifier = toEbayApiIdentifier(api)
  const response = await ebayApiClient.getAppRateLimits()
  const rateLimit = response.rateLimits.find(limit => limit.apiContext === identifier.apiContext) ?? null
  return rateLimit
}

const retrieveLimitForApi = async (apiContext:string, resourceName:string):Promise<EbayAppRateLimitResource|null> => {
  const response = await ebayApiClient.getAppRateLimits()
  const rateLimit = response.rateLimits.find(limit => limit.apiContext === apiContext)
  if (!rateLimit) {
    return null
  }
  return rateLimit.resources.find(res => res.name === resourceName) ?? null
}

let waitUntilReset:Moment|null = null
const retrieveRemainingBrowseCalls = async ():Promise<number> => {

  if (waitUntilReset) {
    if (moment().isSameOrBefore(waitUntilReset)) {
      const timeRemaining = timeDifferenceCalculator.calculate({from: moment(), to: waitUntilReset, shortLabels: true, units: [TimeUnit.HOUR, TimeUnit.MINUTE]})
      logger.info(`API Limit reached, waiting until ${waitUntilReset.toISOString()} for reset, time remaining: ${timeRemaining}`)
      return 0
    } else {
      waitUntilReset = null // assume limit has reset
    }
  }

  const resource = await retrieveLimitForApi("buy", "buy.browse")
  const rate = resource?.rates.find(() => true) ?? null
  if (!rate) {
    logger.error(`Failed to find rate limit for Api Context: buy, resource: buy.browse`)
    return 0
  }
  cachedRate = {rate, timestamp: moment()}

  const limitRemaining = rate.remaining
  if (limitRemaining <= 0) {
    waitUntilReset = moment(rate.reset)
    const timeRemaining = timeDifferenceCalculator.calculate({from: moment(), to: waitUntilReset, shortLabels: true, units: [TimeUnit.HOUR, TimeUnit.MINUTE]})
    logger.info(`API Limit reached, waiting until ${waitUntilReset.toISOString()} for reset, time remaining: ${timeRemaining}`)
    return 0
  }
  logger.info(`Ebay API Limit remaining: ${limitRemaining}`)
  return limitRemaining
}

let cachedRate:{rate:EbayAppRateLimitRate, timestamp:Moment}|null = null

const retrieveRemainingBrowseCallsCached = async ():Promise<number> => {
  if (!cachedRate || cachedRate.timestamp.isBefore(moment().subtract(30, 'minutes'))) {
    await retrieveRemainingBrowseCalls()
  }
  if (!cachedRate) {
    return 0
  }
  return cachedRate.rate.limit
}


// TODO - delete this file once new rate limiter active
export const ebayApiRateLimitRetriever = {
  retrieveLimitForApi,
  retrieveRemainingBrowseCalls,
  retrieveRemainingBrowseCallsCached,
}