import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {
  ALLOW_ALL,
  USER_OPTIONAL_AUTH,
  WEBAPP_ALLOW_ALL,
  WEBAPP_USER_OPTIONAL_AUTH,
} from "../../infrastructure/Authorization";
import {optionalEnum, optionalNumber, optionalString, optionalStringArray, readParam, readParams} from "../../tools/QueryParamReader";
import {
  MarketplaceListingSort,
  MarketplaceListingsRequest,
  publicMarketplaceListingRetriever,
  SortDirection,
} from "../marketplace/PublicMarketplaceListingsRetriever";
import compression from "compression";


export const API_ROOT = '/marketplace-listing'

export const GetPublicMarketplaceListings:Endpoint = {
  path: `${API_ROOT}/public`,
  method: Method.GET,
  auth: WEBAPP_USER_OPTIONAL_AUTH,
  preMiddleware: [compression()],
  requestHandler: async (req, res, next) => {
    const request = readParams<MarketplaceListingsRequest>(
      req.query,
      {
        tags: optionalStringArray(),
        sort: optionalEnum<MarketplaceListingSort>(MarketplaceListingSort),
        sortDirection: optionalEnum<SortDirection>(SortDirection),
        pageIndex: optionalNumber(),
        pageSize: optionalNumber(),
      }
    )

    return publicMarketplaceListingRetriever.retrieve(request)
  },
}

export const GetPublicMarketplaceListingsV2:Endpoint = {
  path: `${API_ROOT}/v2/public`,
  method: Method.GET,
  auth: WEBAPP_USER_OPTIONAL_AUTH,
  preMiddleware: [compression()],
  requestHandler: async (req, res, next) => {
    const request = readParams<MarketplaceListingsRequest>(
      req.query,
      {
        tags: optionalStringArray(),
        sort: optionalEnum<MarketplaceListingSort>(MarketplaceListingSort),
        sortDirection: optionalEnum<SortDirection>(SortDirection),
        pageIndex: optionalNumber(),
        pageSize: optionalNumber(),
      }
    )

    return publicMarketplaceListingRetriever.retrieveV2(request)
  },
}

export const GetPublicMarketplaceListingTags:Endpoint = {
  path: `${API_ROOT}/tag/public`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  preMiddleware: [compression()],
  requestHandler: async (req, res, next) => {
    const query = readParam(req.query, 'query', optionalString())
    return publicMarketplaceListingRetriever.retrieveSearchTags(query)
  },
}