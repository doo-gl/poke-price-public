import {EbayAppRateLimitResponse} from "../EbayApiClientTypes";
import {ebayApiAccessTokenRetriever} from "../access-token/EbayApiAccessTokenRetriever";
import {baseExternalClient} from "../../../../client/BaseExternalClient";
import {logger} from "firebase-functions";

export interface RateLimitOptions {
  accessToken?:string,
  idempotencyKey?:string,
}

const IDEMPOTENCY_KEY_TO_REQUEST = new Map<string,{promise: Promise<EbayAppRateLimitResponse>}>()

const makeRateLimitRequest = async (options?:RateLimitOptions):Promise<EbayAppRateLimitResponse> => {
  const accessToken = options?.accessToken ?? (await ebayApiAccessTokenRetriever.retrieve())

  const headers:any = {
    'Authorization': `Bearer ${accessToken}`,
  }
  const url = `https://api.ebay.com/developer/analytics/v1_beta/rate_limit/`
  const response = await baseExternalClient.get<EbayAppRateLimitResponse>(url, headers, null)

  return response
}

const getAppRateLimits = async (options?:RateLimitOptions):Promise<EbayAppRateLimitResponse> => {
  const idempotencyKey = options?.idempotencyKey ?? null
  if (!idempotencyKey) {
    return await makeRateLimitRequest(options)
  }

  const previousRequest = IDEMPOTENCY_KEY_TO_REQUEST.get(idempotencyKey) ?? null
  if (previousRequest) {
    logger.info(`Returning idempotent call for ebay rate limit api: ${idempotencyKey}`)
    return previousRequest.promise
  }

  logger.info(`Returning new call for ebay rate limit api`)
  const newRequest = {promise: makeRateLimitRequest(options)}
  IDEMPOTENCY_KEY_TO_REQUEST.set(idempotencyKey, newRequest)
  const result = await newRequest.promise
  IDEMPOTENCY_KEY_TO_REQUEST.delete(idempotencyKey)
  return result
}

export const ebayApiRateLimitClient = {
  getAppRateLimits,
}