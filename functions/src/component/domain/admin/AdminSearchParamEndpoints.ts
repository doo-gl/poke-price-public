import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {ADMIN_AUTH} from "../../infrastructure/Authorization";
import {ebaySearchParamPriceReconciler} from "../ebay/search-param/EbaySearchParamPriceReconciler";


export const AdminReconcileListingsForSearch:Endpoint = {
  path: '/ebay-search-param/:id/action/reconcile-listings',
  method: Method.PUT,
  auth: ADMIN_AUTH,
  requestHandler: async (req, res, next) => {
    const searchId = req.params.id
    await ebaySearchParamPriceReconciler.reconcile(searchId);
    return {}
  },
}