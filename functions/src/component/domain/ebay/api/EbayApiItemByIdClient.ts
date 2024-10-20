import {ebayApiAccessTokenRetriever} from "./access-token/EbayApiAccessTokenRetriever";
import {baseExternalClient} from "../../../client/BaseExternalClient";
import {
  EbayCurrencyAmount,
  EbayEstimatedAvailability,
  EbayImage,
  EbayItemGroupSummary,
  EbayLocation,
  EbayPaymentMethod,
  EbayReturnTerms,
  EbaySeller,
  EbayShippingOption,
  EbayShipToLocation,
  EbaySite,
  EbayTaxes,
  EbayTypedNameValue,
  toEbayId,
} from "./EbayApiClientTypes";
import {UnexpectedError} from "../../../error/UnexpectedError";
import {ebayApiRateLimitQuerier} from "./rate-limit/EbayApiRateLimitQuerier";
import {EbayApi} from "./rate-limit/EbayApiRateLimitEntity";
import {ExternalClientError} from "../../../error/ExternalClientError";
import {EbaySearchResponse} from "./EbayApiItemSearchClient";

export interface ItemByIdOptions {
  accessToken?:string,
  ebaySite?:EbaySite,
}

export interface EbayItem {
  itemId:string,
  sellerItemRevision:string,
  title:string,
  subtitle:string,
  shortDescription:string,
  price:EbayCurrencyAmount,
  categoryPath:string,
  categoryIdPath:string,
  itemLocation:EbayLocation,
  image:EbayImage,
  itemCreationDate:string, //YYYY-MM-DDTHH:mm:ss.SSSZ
  seller:EbaySeller,
  estimatedAvailabilities:Array<EbayEstimatedAvailability>,
  shippingOptions:Array<EbayShippingOption>
  shipToLocations:EbayShipToLocation,
  returnTerms:EbayReturnTerms,
  taxes:Array<EbayTaxes>,
  localizedAspects:Array<EbayTypedNameValue>,
  topRatedBuyingExperience:boolean,
  buyingOptions:Array<EbayShippingOption>,
  itemAffiliateWebUrl?:string,
  itemWebUrl:string,
  description:string,
  paymentMethods:Array<EbayPaymentMethod>
  primaryItemGroup?:EbayItemGroupSummary,
  enabledForGuestCheckout:boolean,
  eligibleForInlineCheckout:boolean,
  legacyItemId:string,
  priorityListing:boolean,
  adultOnly:boolean,
  categoryId:string,
  listingMarketplaceId:EbaySite,
}

const getItemsByIds = async (ids:Array<string>):Promise<any> => {
  // forbidden from using multiple by id, need to request access
  throw new UnexpectedError(`Not implemented`)
}

const getItemById = async (id:string, options?:ItemByIdOptions):Promise<EbayItem> => {
  const accessToken = options?.accessToken ?? (await ebayApiAccessTokenRetriever.retrieve())

  const headers:any = {
    'Authorization': `Bearer ${accessToken}`,
  }
  if (options?.ebaySite) {
    headers['X-EBAY-C-MARKETPLACE-ID'] = options.ebaySite
  }
  const url = `https://api.ebay.com/buy/browse/v1/item/${toEbayId(id)}`

  try {
    const response = await baseExternalClient.get<EbayItem>(url, headers, null)
    await ebayApiRateLimitQuerier.trackApiCalls(EbayApi.BUY_BROWSE, 1)
    return response
  } catch (err) {
    if (err instanceof ExternalClientError && err.responseStatus === 429) {
      await ebayApiRateLimitQuerier.onTooManyRequestsError(EbayApi.BUY_BROWSE)
    }
    throw err
  }
}

export const ebayApiItemByIdClient = {
  getItemsByIds,
  getItemById,
}