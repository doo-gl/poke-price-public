import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {ALLOW_ALL, WEBAPP_ALLOW_ALL} from "../../infrastructure/Authorization";
import {recentPriceRetriever} from "../recent-price/RecentPriceRetriever";

export const API_ROOT = '/price'

export const GetRecentPrices:Endpoint = {
  path: `${API_ROOT}/public/recent`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    return recentPriceRetriever.retrieve();
  },
}