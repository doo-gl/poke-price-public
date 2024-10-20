import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {WEBAPP_USER_AUTH, WEBAPP_USER_OPTIONAL_AUTH} from "../../infrastructure/Authorization";
import {
  nullableBoolean,
  nullableEnum,
  nullableString,
  nullableStringArray,
  readParams,
} from "../../tools/QueryParamReader";
import {
  CardCollectionRetrieveRequest,
  OwnershipFilter,
  publicCardCollectionDtoRetriever,
} from "../card-collection/PublicCardCollectionDtoRetriever";
import {JSONSchemaType} from "ajv";
import {
  favouriteCollectionMarker,
  MarkFavouriteCollectionRequest,
} from "../card-collection/favourite/FavouriteCollectionMarker";
import {jsonValidator} from "../../tools/JsonValidator";
import compression from "compression";

export const API_ROOT = '/card-collection'

export const GetPublicCardCollections:Endpoint = {
  path: `${API_ROOT}/public`,
  method: Method.GET,
  auth: WEBAPP_USER_OPTIONAL_AUTH,
  preMiddleware: [compression()],
  requestHandler: async (req, res, next) => {
    const request:CardCollectionRetrieveRequest = readParams(
      req.query,
      {
        fromId: nullableString(),
        searchKey: nullableString(),
        cardCollectionId: nullableStringArray(),
        parentCollectionId: nullableString(),
        setId: nullableString(),
        ownershipFilter: nullableEnum<OwnershipFilter>(OwnershipFilter),
        includeFavourites: nullableBoolean(),
      }
    )
    return publicCardCollectionDtoRetriever.retrieve(request)
  },
}


const markFavouriteCollectionSchema:JSONSchemaType<MarkFavouriteCollectionRequest> = {
  type: "object",
  properties: {
    userId: { type: "string" },
    collectionId: { type: "string" },
  },
  additionalProperties: false,
  required: ["userId", "collectionId"],
}
export const MarkCollectionAsFavourite:Endpoint = {
  path: `${API_ROOT}/favourite/action/mark`,
  method: Method.PUT,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    const body = jsonValidator.validate(req.body, markFavouriteCollectionSchema);
    await favouriteCollectionMarker.mark(body)
    return {}
  },
}

export const UnmarkCollectionAsFavourite:Endpoint = {
  path: `${API_ROOT}/favourite/action/unmark`,
  method: Method.PUT,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    const body = jsonValidator.validate(req.body, markFavouriteCollectionSchema);
    await favouriteCollectionMarker.unmark(body)
    return {}
  },
}