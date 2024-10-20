import {SearchParams} from "../search-param/EbayCardSearchParamEntity";
import {ebayApiItemSearchClient, EbaySearchResponse, SearchOptions} from "./EbayApiItemSearchClient";
import {ebayApiItemByIdClient, EbayItem, ItemByIdOptions} from "./EbayApiItemByIdClient";
import {ebayApiRateLimitClient, RateLimitOptions} from "./rate-limit/EbayApiRateLimitClient";
import {EbayAppRateLimitResponse} from "./EbayApiClientTypes";

const search = async (keywords:SearchParams, options?:SearchOptions):Promise<EbaySearchResponse> => {
  return ebayApiItemSearchClient.search(keywords, options)
}

const getItemById = async (id:string, options?:ItemByIdOptions):Promise<EbayItem> => {
  return ebayApiItemByIdClient.getItemById(id, options)
}

const getAppRateLimits = async (options?:RateLimitOptions):Promise<EbayAppRateLimitResponse> => {
  return ebayApiRateLimitClient.getAppRateLimits(options)
}

export const ebayApiClient = {
  search,
  getItemById,
  getAppRateLimits,
}