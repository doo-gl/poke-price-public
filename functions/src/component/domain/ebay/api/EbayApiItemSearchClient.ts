import {SearchParams} from "../search-param/EbayCardSearchParamEntity";
import {ebayApiAccessTokenRetriever} from "./access-token/EbayApiAccessTokenRetriever";
import {queryString} from "../../../external-lib/QueryString";
import {baseExternalClient} from "../../../client/BaseExternalClient";
import {
  EbayBuyingOption,
  EbayCategory,
  EbayCurrencyAmount,
  EbayImage,
  EbayLocation,
  EbaySeller,
  EbayShippingOption,
  EbaySite,
} from "./EbayApiClientTypes";
import {ebayApiRateLimitQuerier} from "./rate-limit/EbayApiRateLimitQuerier";
import {EbayApi} from "./rate-limit/EbayApiRateLimitEntity";
import {ExternalClientError} from "../../../error/ExternalClientError";

export interface SearchOptions {
  accessToken?:string,
  limit?:number,
  offset?:number,
  ebaySite?:EbaySite,
}

export interface EbaySearchItemSummary {
  itemId:string,
  title:string,
  itemGroupHref?:string,
  leafCategoryIds:Array<string>,
  categories:Array<EbayCategory>
  image:EbayImage,
  price?:EbayCurrencyAmount,
  itemGroupType?:string,
  itemHref:string,
  seller:EbaySeller,
  condition:string,
  thumbnailImages:Array<EbayImage>,
  shippingOptions:Array<EbayShippingOption>,
  buyingOptions:Array<EbayBuyingOption>,
  bidCount?:number,
  currentBidPrice?:EbayCurrencyAmount,
  itemWebUrl:string,
  itemLocation:EbayLocation,
  additionalImages:Array<EbayImage>,
  adultOnly:boolean,
  legacyItemId:string,
  availableCoupons:boolean,
  itemCreationDate:string //YYYY-MM-DDTHH:mm:ss.SSSZ
  itemEndDate?:string //YYYY-MM-DDTHH:mm:ss.SSSZ
  topRatedBuyingExperience:boolean,
  priorityListing:boolean,
  listingMarketplaceId:string,
}

export interface EbaySearchResponse {
  total:number,
  limit:number,
  offset:number,
  href:string,
  next:string,
  itemSummaries?:Array<EbaySearchItemSummary>
}

const encode = (keyword:string):string => {
  // https://stackoverflow.com/questions/18251399/why-doesnt-encodeuricomponent-encode-single-quotes-apostrophes
  return encodeURIComponent(keyword)
    .replace(/'/g, '%27')
}

const createKeywordParamValue = (searchParams:SearchParams):string => {
  const includes = searchParams.includeKeywords.map(keyword => encode(keyword)).join('+');
  const excludes = searchParams.excludeKeywords.map(keyword => `-${encode(keyword)}`).join('+');
  return `${includes}+${excludes}`;
}

// https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search
const search = async (keywords:SearchParams, options?:SearchOptions):Promise<EbaySearchResponse> => {
  const accessToken = options?.accessToken ?? (await ebayApiAccessTokenRetriever.retrieve())

  const queryParams:any = {
    q: createKeywordParamValue(keywords),
    filter: `buyingOptions:{${EbayBuyingOption.FIXED_PRICE}|${EbayBuyingOption.BEST_OFFER}|${EbayBuyingOption.AUCTION}}`,
    limit: options?.limit ?? 200,
  }
  if (options?.offset) {
    queryParams['offset'] = options.offset
  }

  const headers:any = {
    'Authorization': `Bearer ${accessToken}`,
  }
  if (options?.ebaySite) {
    headers['X-EBAY-C-MARKETPLACE-ID'] = options.ebaySite
  }
  const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?${queryString.stringify(queryParams, {encode: false})}`

  try {
    const response = await baseExternalClient.get<EbaySearchResponse>(url, headers, null)
    await ebayApiRateLimitQuerier.trackApiCalls(EbayApi.BUY_BROWSE, 1)
    return response
  } catch (err) {
    if (err instanceof ExternalClientError && err.responseStatus === 429) {
      await ebayApiRateLimitQuerier.onTooManyRequestsError(EbayApi.BUY_BROWSE)
    }
    throw err
  }
}

export const ebayApiItemSearchClient = {
  search,
}