import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {ALLOW_ALL, WEBAPP_ALLOW_ALL} from "../../infrastructure/Authorization";
import {publicSiteTrendDataRetriever} from "../trends/PublicSiteTrendDataRetriever";

export const API_ROOT = '/trend'

export const GetPublicTrends:Endpoint = {
  path: `${API_ROOT}/public`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    return await publicSiteTrendDataRetriever.retrieve()
  },
}