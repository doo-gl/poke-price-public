import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {ADMIN_AUTH} from "../../infrastructure/Authorization";
import {priceActivator} from "../historical-card-price/PriceActivator";
import {priceIgnorer} from "../historical-card-price/PriceIgnorer";

export const AdminActivatePrice:Endpoint = {
  path: '/historical-card-price/:id/action/activate',
  method: Method.PUT,
  auth: ADMIN_AUTH,
  requestHandler: async (req, res, next) => {
    const id = req.params.id
    await priceActivator.activate(id)
    return {}
  },
}

export const AdminDeactivatePrice:Endpoint = {
  path: '/historical-card-price/:id/action/deactivate',
  method: Method.PUT,
  auth: ADMIN_AUTH,
  requestHandler: async (req, res, next) => {
    const id = req.params.id
    await priceIgnorer.ignore(id)
    return {}
  },
}