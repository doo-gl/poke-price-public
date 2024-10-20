import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {ALLOW_ALL, WEBAPP_ALLOW_ALL} from "../../infrastructure/Authorization";
import {
  nonNullStringArray,
  optionalEnum,
  optionalNumber,
  optionalString,
  optionalStringArray,
  readParam,
  readParams,
} from "../../tools/QueryParamReader";
import {PublicItemRequest, publicItemRetriever} from "../item/public-retrieval/PublicItemRetriever";
import {jsonValidator} from "../../tools/JsonValidator";
import {SortDirection} from "../card/PublicCardDtoRetrieverV3";
import {JSONSchemaType} from "ajv";
import {ItemSort, PublicItemRequestV2, publicItemRetrieverV2} from "../item/public-retrieval/PublicItemRetrieverV2";
import {publicBasicItemRetriever} from "../item/public-retrieval/PublicBasicItemRetriever";
import compression from "compression";

export const API_ROOT = '/item'

export const GetPublicItems:Endpoint = {
  path: `${API_ROOT}/public`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  preMiddleware: [compression()],
  requestHandler: async (req, res, next) => {
    const request = readParams<PublicItemRequest>(
      req.query,
      {
        itemIds: nonNullStringArray(),
      }
    )
    const items = await publicItemRetriever.retrieve(request)
    return items;
  },
}

export const GetRelatedItemsById:Endpoint = {
  path: `${API_ROOT}/v2/related/:itemIdOrSlug`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  preMiddleware: [compression()],
  requestHandler: async (req, res, next) => {
    const itemIdOrSlug = req.params['itemIdOrSlug']
    return publicItemRetrieverV2.retrieveRelatedItemsForItem(itemIdOrSlug)
  },
}


interface BulkGetPublicItemsByIdRequest {
  itemIds:Array<string>
}
export const bulkGetPublicItemsByIdSchema:JSONSchemaType<BulkGetPublicItemsByIdRequest> = {
  type: "object",
  properties: {
    itemIds: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
  required: ["itemIds"],
}
export const BulkGetPublicItemsByIdsV3:Endpoint = {
  path: `${API_ROOT}/v2/public/action/get-bulk-by-ids`,
  method: Method.PUT,
  auth: WEBAPP_ALLOW_ALL,
  preMiddleware: [compression()],
  requestHandler: async (req, res, next) => {
    const request = jsonValidator.validate(req.body, bulkGetPublicItemsByIdSchema)
    return publicItemRetrieverV2.retrieveByIds(request.itemIds);
  },
}

export const BulkGetPublicBasicItemsByIdsV3:Endpoint = {
  path: `${API_ROOT}/v2/public-basic/action/get-bulk-by-ids`,
  method: Method.PUT,
  auth: WEBAPP_ALLOW_ALL,
  preMiddleware: [compression()],
  requestHandler: async (req, res, next) => {
    const request = jsonValidator.validate(req.body, bulkGetPublicItemsByIdSchema)
    return publicBasicItemRetriever.retrieveByIds(request.itemIds);
  },
}

export const GetPublicItemsV2:Endpoint = {
  path: `${API_ROOT}/v2/public`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  preMiddleware: [compression()],
  requestHandler: async (req, res, next) => {
    const request:PublicItemRequestV2 = readParams<PublicItemRequestV2>(
      req.query,
      {
        tags: optionalStringArray(),
        sort: optionalEnum<ItemSort>(ItemSort),
        sortDirection: optionalEnum<SortDirection>(SortDirection),
        pageIndex: optionalNumber(),
        pageSize: optionalNumber(),
      }
    );
    return publicItemRetrieverV2.retrieve(request)
  },
}

export const GetPublicBasicItemsV2:Endpoint = {
  path: `${API_ROOT}/v2/public-basic`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  preMiddleware: [compression()],
  requestHandler: async (req, res, next) => {
    const request:PublicItemRequestV2 = readParams<PublicItemRequestV2>(
      req.query,
      {
        tags: optionalStringArray(),
        sort: optionalEnum<ItemSort>(ItemSort),
        sortDirection: optionalEnum<SortDirection>(SortDirection),
        pageIndex: optionalNumber(),
        pageSize: optionalNumber(),
      }
    );
    return publicBasicItemRetriever.retrieve(request)
  },
}

export const GetPublicItemTags:Endpoint = {
  path: `${API_ROOT}/v2/tag/public`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  preMiddleware: [compression()],
  requestHandler: async (req, res, next) => {
    const query = readParam(req.query, 'query', optionalString())
    return publicItemRetrieverV2.retrieveSearchTags(query)
  },
}

export const GetPublicItem:Endpoint = {
  path: `${API_ROOT}/v2/public/:idOrSlug`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  preMiddleware: [compression()],
  requestHandler: async (req, res, next) => {
    const idOrSlug = req.params['idOrSlug']
    return publicItemRetrieverV2.retrieveByIdOrSlug(idOrSlug);
  },
}