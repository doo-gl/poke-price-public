import {Endpoint, Method} from "../../../infrastructure/express/Endpoint";
import {NO_AUTHORIZATION} from "../../../infrastructure/Authorization";
import {ResponseFormat} from "../../../infrastructure/express/PromiseResponseMapper";
import {logger} from "firebase-functions";


export const EbayMarketplaceAccountDeletion:Endpoint = {
  path: '',
  method: Method.POST,
  auth: NO_AUTHORIZATION,
  responseFormat: ResponseFormat.JSON,
  requestHandler: async (req, res, next) => {

    const body:any = req.body
    // logger.info(JSON.stringify(body))
    // if you actually start storing ebay data with user info, use this to delete it
    return {result: true};
  },
}