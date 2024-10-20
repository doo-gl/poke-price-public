import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {
  ALLOW_ALL,
  USER_AUTH,
  USER_OPTIONAL_AUTH,
  WEBAPP_ALLOW_ALL,
  WEBAPP_USER_AUTH, WEBAPP_USER_OPTIONAL_AUTH,
} from "../../infrastructure/Authorization";
import {PublicCardDto, UserCardDto} from "../card/PublicCardDto";
import {publicCardDtoRetriever} from "../card/PublicCardDtoRetriever";
import {userCardDtoRetriever} from "../card/UserCardDtoRetriever";
import {
  optionalEnum,
  optionalNumber,
  optionalString,
  optionalStringArray,
  readParam,
  readParams,
} from "../../tools/QueryParamReader";
import {CardRequest, publicCardDtoRetrieverV2} from "../card/PublicCardDtoRetrieverV2";
import {publicCardQueryMetadataRetriever} from "../card/query/PublicCardQueryMetadataRetriever";
import {publicCardStatsRetriever} from "../stats/card-v2/PublicCardStatsRetriever";
import {relatedCardRetriever} from "../card/RelatedCardRetriever";
import {publicCardListAliasRetriever} from "../card/seo/alias/PublicCardListAliasRetriever";
import {jsonValidator} from "../../tools/JsonValidator";
import {JSONSchemaType} from "ajv";
import {CardSort, CardsRequest, publicCardDtoRetrieverV3, SortDirection} from "../card/PublicCardDtoRetrieverV3";

export const API_ROOT = '/card'

export const GetPublicCard:Endpoint = {
  path: `${API_ROOT}/public/:idOrSlug`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const idOrSlug = req.params['idOrSlug']
    const result:PublicCardDto = await publicCardDtoRetriever.retrieveCached(idOrSlug);
    return Promise.resolve(result);
  },
}

export const GetUserCard:Endpoint = {
  path: `${API_ROOT}/user/:idOrSlug`,
  method: Method.GET,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    const idOrSlug = req.params['idOrSlug']
    const result:UserCardDto = await userCardDtoRetriever.retrieveCached(idOrSlug);
    return Promise.resolve(result);
  },
}

export const GetPublicCardsV2:Endpoint = {
  path: `${API_ROOT}/v2/public`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const request:CardRequest = readParams<CardRequest>(
      req.query,
      {
        series: optionalString(),
        set: optionalString(),
        name: optionalString(),
        number: optionalString(),
        setNumber: optionalString(),
        artist: optionalString(),
        rarity: optionalString(),
        superType: optionalString(),
        subType: optionalStringArray(),
        energyType: optionalStringArray(),
        pokemon: optionalStringArray(),
        variant: optionalString(),
        soldPrice: optionalString(),
        listingPrice: optionalString(),
        soldVolume: optionalString(),
        listingVolume: optionalString(),
        totalCirculation: optionalString(),
        supplyVsDemand: optionalString(),
        volatility: optionalString(),
        fromId: optionalString(),
        tags: optionalStringArray(),
      }
    );
    return publicCardDtoRetrieverV2.retrieveManyV2(request)
    // return publicCardDtoRetrieverV2.retrieveCached(request)
  },
}

export const GetPublicCardMetadata:Endpoint = {
  path: `${API_ROOT}/v2/public/metadata`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    return publicCardQueryMetadataRetriever.retrieve();
  },
}

export const GetCardStats:Endpoint = {
  path: `${API_ROOT}/stats/:id`,
  method: Method.GET,
  auth: WEBAPP_USER_OPTIONAL_AUTH,
  requestHandler: async (req, res, next) => {
    const id = req.params['id']
    return publicCardStatsRetriever.retrieve(id);
  },
}

export const GetPublicCardsByIds:Endpoint = {
  path: `${API_ROOT}/v2/public/action/by-ids`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const ids = readParam(req.query, 'cardId', optionalStringArray())
    return publicCardDtoRetrieverV2.retrieveManyByIdCached(ids ?? []);
  },
}

interface BulkGetPublicCardsByIdRequest {
  cardIds:Array<string>
}
export const bulkGetPublicCardsByIdSchema:JSONSchemaType<BulkGetPublicCardsByIdRequest> = {
  type: "object",
  properties: {
    cardIds: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
  required: ["cardIds"],
}

export const BulkGetPublicCardsByIds:Endpoint = {
  path: `${API_ROOT}/v2/public/action/get-bulk-by-ids`,
  method: Method.PUT,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const request = jsonValidator.validate(req.body, bulkGetPublicCardsByIdSchema)
    return publicCardDtoRetrieverV2.retrieveManyByIdV2(request.cardIds);
  },
}

export const GetRelatedCardsById:Endpoint = {
  path: `${API_ROOT}/related/:cardId`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const cardId = req.params['cardId']
    return relatedCardRetriever.retrieveForCardId(cardId)
  },
}

export const GetCardListAlias:Endpoint = {
  path: `${API_ROOT}/alias/:aliasSlug`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const aliasSlug = req.params['aliasSlug']
    const alias = await publicCardListAliasRetriever.retrieveForAliasSlug(aliasSlug)
    if (!alias) {
      return;
    }
    return alias
  },
}

export const BulkGetPublicCardsByIdsV3:Endpoint = {
  path: `${API_ROOT}/v3/public/action/get-bulk-by-ids`,
  method: Method.PUT,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const request = jsonValidator.validate(req.body, bulkGetPublicCardsByIdSchema)
    return publicCardDtoRetrieverV3.retrieveManyById(request.cardIds);
  },
}

export const GetPublicCardsV3:Endpoint = {
  path: `${API_ROOT}/v3/public`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const request:CardsRequest = readParams<CardsRequest>(
      req.query,
      {
        tags: optionalStringArray(),
        sort: optionalEnum<CardSort>(CardSort),
        sortDirection: optionalEnum<SortDirection>(SortDirection),
        pageIndex: optionalNumber(),
        pageSize: optionalNumber(),
      }
    );
    return publicCardDtoRetrieverV3.retrieveMany(request)
  },
}

export const GetPublicCardTags:Endpoint = {
  path: `${API_ROOT}/v3/tag/public`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const query = readParam(req.query, 'query', optionalString())
    return publicCardDtoRetrieverV3.retrieveSearchTags(query)
  },
}