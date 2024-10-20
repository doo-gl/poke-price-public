import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {USER_AUTH, WEBAPP_ALLOW_ALL, WEBAPP_USER_AUTH} from "../../infrastructure/Authorization";
import {jsonValidator} from "../../tools/JsonValidator";
import {cardOwnershipMarker, markRequestSchema} from "./CardOwnershipMarker";
import {nonNullStringArray, readParams} from "../../tools/QueryParamReader";
import {cardOwnershipDtoRetriever} from "./CardOwnershipDtoRetriever";
import {cardOwnershipMapper} from "./CardOwnershipMapper";

export const API_ROOT = '/card-ownership';

export const MarkCardAsOwned:Endpoint = {
  path: `${API_ROOT}/action/mark-as-owned`,
  method: Method.PUT,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    const request = jsonValidator.validate(req.body, markRequestSchema);
    const ownerships = await cardOwnershipMarker.markAsOwned(request)
    const results = ownerships.map(ownership => cardOwnershipMapper.mapDto(ownership))
    return { results }
  },
}

export const MarkCardAsNotOwned:Endpoint = {
  path: `${API_ROOT}/action/mark-as-not-owned`,
  method: Method.PUT,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    const request = jsonValidator.validate(req.body, markRequestSchema);
    const ownerships = await cardOwnershipMarker.markAsNotOwned(request)
    const results = ownerships.map(ownership => cardOwnershipMapper.mapDto(ownership))
    return { results }
  },
}

export const GetCardsOwnedByUser:Endpoint = {
  path: `${API_ROOT}`,
  method: Method.GET,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    const request = readParams(
      req.query,
      {
        cardId: nonNullStringArray(),
      }
    )
    return cardOwnershipDtoRetriever.retrieveCardsOwnedByCallingUser(request.cardId);
  },
}