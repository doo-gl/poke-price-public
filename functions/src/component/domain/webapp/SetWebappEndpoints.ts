import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {ALLOW_ALL, WEBAPP_ALLOW_ALL} from "../../infrastructure/Authorization";
import {PublicSetDto} from "../set/PublicSetDto";
import {publicSetDtoRetriever, RetrieveManyPublicSetRequest} from "../set/PublicSetDtoRetriever";
import {nullableString, readParams} from "../../tools/QueryParamReader";
import {convertToKey} from "../../tools/KeyConverter";

export const API_ROOT = '/set';

export const GetPublicSet:Endpoint = {
  path: `${API_ROOT}/public/:id`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const id = req.params['id']
    const result:PublicSetDto = await publicSetDtoRetriever.retrieveCached(id);
    return Promise.resolve(result);
  },
}

export const GetPublicSets:Endpoint = {
  path: `${API_ROOT}/public`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const request:RetrieveManyPublicSetRequest = readParams<RetrieveManyPublicSetRequest>(
      req.query,
      {
        searchKey: nullableString(),
      }
    );
    request.searchKey = request.searchKey ? convertToKey(request.searchKey) : null;
    const result = {
      results: await publicSetDtoRetriever.retrieveManyCached(request),
    }
    return Promise.resolve(result);
  },
}