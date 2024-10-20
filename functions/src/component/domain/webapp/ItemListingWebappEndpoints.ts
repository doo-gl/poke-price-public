import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {ALLOW_ALL, WEBAPP_ALLOW_ALL} from "../../infrastructure/Authorization";
import {publicItemListingRetriever} from "../item/listing/PublicItemListingRetriever";

export const API_ROOT = '/item-listing'

export const GetPublicItemListing:Endpoint = {
  path: `${API_ROOT}/public/:id`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const id = req.params['id']
    return await publicItemListingRetriever.retrieveById(id);
  },
}