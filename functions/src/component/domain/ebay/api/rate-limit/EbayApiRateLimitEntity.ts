import {Entity} from "../../../../database/Entity";
import {Timestamp} from "../../../../external-lib/Firebase";
import {UnexpectedError} from "../../../../error/UnexpectedError";
import {repositoryFactory} from "../../../../database/RepositoryFactory";

const COLLECTION_NAME = 'ebay-api-rate-limit'

export enum EbayApi {
  BUY_BROWSE = 'BUY_BROWSE'
}

export interface EbayApiIdentifier {
  apiContext:string,
  apiResourceName:string
}

export const toEbayApiIdentifier = (api:EbayApi):EbayApiIdentifier => {
  switch (api) {
    case EbayApi.BUY_BROWSE:
      return {apiContext: "buy", apiResourceName: "buy.browse"}
    default:
      throw new UnexpectedError(`Unexpected ebay api: ${api}`)
  }
}

export const toOptionalEbayApi = (identifier:EbayApiIdentifier):EbayApi|null => {
  if (
    toEbayApiIdentifier(EbayApi.BUY_BROWSE).apiContext === identifier.apiContext
    && toEbayApiIdentifier(EbayApi.BUY_BROWSE).apiResourceName === identifier.apiResourceName
  ) {
    return EbayApi.BUY_BROWSE
  }
  return null
}

export interface EbayApiRateLimitDetails {
  apiContext:string,
  apiResourceName:string,
  api:EbayApi,
  dailyLimit:number,
  dailyLimitRemaining:number,
  estimatedUsageSinceUpdate:number,
  estimatedUsageRemaining:number,
  limitRanOutAt:Timestamp|null,
  limitResetsAt:Timestamp,
  limitLastUpdatedAt:Timestamp,
}

export interface EbayApiRateLimitEntity extends Entity {
  timestamp:Timestamp,
  lastUpdatedAt:Timestamp,
  rateLimits:Array<EbayApiRateLimitDetails>

}

const result = repositoryFactory.build<EbayApiRateLimitEntity>(COLLECTION_NAME);
export const ebayRateLimitRepository = result.repository;
export const baseEbayRateLimitCreator = result.creator;
export const baseEbayRateLimitUpdater = result.updater;
export const baseEbayRateLimitDeleter = result.deleter;