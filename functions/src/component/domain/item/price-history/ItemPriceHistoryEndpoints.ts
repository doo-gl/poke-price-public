import {Endpoint, Method} from "../../../infrastructure/express/Endpoint";
import {WEBAPP_ALLOW_ALL} from "../../../infrastructure/Authorization";
import compression from "compression";
import {publicItemPriceHistoryRetriever} from "./PublicItemPriceHistoryRetriever";
import {itemPriceHistoryBackfillRequester} from "./ItemPriceHistoryBackfillTrigger";

const API_ROOT = '/item-price-history'

export const RequestHistoryBackfill:Endpoint = {
  path: `${API_ROOT}/item/:itemIdOrSlug/action/request-history`,
  method: Method.PUT,
  auth: WEBAPP_ALLOW_ALL,
  preMiddleware: [compression()],
  requestHandler: async (req, res, next) => {
    const itemIdOrSlug = req.params.itemIdOrSlug
    return await itemPriceHistoryBackfillRequester.request(itemIdOrSlug)
  },
}
export const GetItemPriceHistory:Endpoint = {
  path: `${API_ROOT}/item/:itemIdOrSlug/public`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  preMiddleware: [compression()],
  requestHandler: async (req, res, next) => {
    const itemIdOrSlug = req.params.itemIdOrSlug;
    return await publicItemPriceHistoryRetriever.retrieve(itemIdOrSlug)
  },
}