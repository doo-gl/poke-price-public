import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {ALLOW_ALL, WEBAPP_ALLOW_ALL} from "../../infrastructure/Authorization";
import {nonNullEnum, nullableString, nullableStringArray, readParams} from "../../tools/QueryParamReader";
import {publicSearchTagRetriever, SearchTagRequest} from "../search-tag/PublicSearchTagRetriever";
import {SearchTagType} from "../search-tag/SearchTagEntity";

export const API_ROOT = '/search-tag'

export const GetPublicTags:Endpoint = {
  path: `${API_ROOT}/public`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const request = readParams<SearchTagRequest>(req.query, {
      searchTagType: nonNullEnum<SearchTagType>(SearchTagType),
      tags: nullableStringArray(),
      keys: nullableStringArray(),
      query: nullableString(),
    })
    return publicSearchTagRetriever.retrieveTags(request)
  },
}