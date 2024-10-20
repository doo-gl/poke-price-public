import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {
  ALLOW_ALL,
  USER_AUTH,
  USER_OPTIONAL_AUTH,
  WEBAPP_ALLOW_ALL,
  WEBAPP_USER_OPTIONAL_AUTH,
} from "../../infrastructure/Authorization";
import {recentPriceRetriever} from "../recent-price/RecentPriceRetriever";
import {jsonValidator} from "../../tools/JsonValidator";
import {PublicListingRequest, publicListingRetriever} from "../ebay/open-listing/public-listing/PublicListingRetriever";
import {nonNullString, nullableEnum, optionalEnum, readParams} from "../../tools/QueryParamReader";
import {userContext} from "../../infrastructure/UserContext";
import {ebayOpenListingRepository} from "../ebay/open-listing/EbayOpenListingRepository";
import {openListingContentGenerator} from "../ebay/open-listing/content/OpenListingContentGenerator";
import {CurrencyCode} from "../money/CurrencyCodes";

export const API_ROOT = '/listing'

export const GetPublicListings:Endpoint = {
  path: `${API_ROOT}/public`,
  method: Method.GET,
  auth: WEBAPP_USER_OPTIONAL_AUTH,
  requestHandler: async (req, res, next) => {
    const request = readParams<PublicListingRequest>(
      req.query,
      {
        itemId: nonNullString(),
        userCurrency: optionalEnum<CurrencyCode>(CurrencyCode),
      }
    )
    const user = userContext.getUser()
    const listings = await publicListingRetriever.retrieveListings(user, request)
    return listings;
  },
}

export const GetListingContent:Endpoint = {
  path: `${API_ROOT}/content--TEST`,
  method: Method.GET,
  auth: WEBAPP_USER_OPTIONAL_AUTH,
  requestHandler: async (req, res, next) => {
    const listing = (await ebayOpenListingRepository.getMany([], {limit: 1}))[0];
    const content = openListingContentGenerator.generate(listing)

    return content;
  },
}