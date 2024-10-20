import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {ALLOW_ALL, WEBAPP_ALLOW_ALL} from "../../infrastructure/Authorization";
import {publicNewsDtoRetriever} from "../news/PublicNewsDtoRetriever";

export const API_ROOT = '/news';

export const GetPublicNews:Endpoint = {
  path: `${API_ROOT}/public`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const result = {
      results: await publicNewsDtoRetriever.retrieveManyCached(),
    }
    return Promise.resolve(result);
  },
}