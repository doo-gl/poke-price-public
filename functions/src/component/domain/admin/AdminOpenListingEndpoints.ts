import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {ADMIN_AUTH} from "../../infrastructure/Authorization";
import {ebayOpenListingArchiver} from "../ebay/open-listing/EbayOpenListingArchiver";


export const AdminArchiveOpenListing:Endpoint = {
  path: '/open-listing/:id/action/archive',
  method: Method.PUT,
  auth: ADMIN_AUTH,
  requestHandler: async (req, res, next) => {
    const listingId = req.params.id
    await ebayOpenListingArchiver.archive(listingId)
    return {}
  },
}