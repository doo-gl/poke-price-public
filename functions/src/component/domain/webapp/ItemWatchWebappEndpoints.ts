import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {ALLOW_ALL, USER_AUTH, WEBAPP_ALLOW_ALL, WEBAPP_USER_AUTH} from "../../infrastructure/Authorization";
import {itemWatchDtoRetriever} from "../watch/ItemWatchDtoRetriever";
import {userContext} from "../../infrastructure/UserContext";
import {jsonValidator} from "../../tools/JsonValidator";
import {itemWatchActivationSchema, itemWatchActivator} from "../watch/ItemWatchActivator";
import {itemWatchDeactivationSchema, itemWatchDeactivator} from "../watch/ItemWatchDeactivator";
import {itemWatchCountRetriever} from "../watch/ItemWatchCountRetriever";


export const API_ROOT = '/item-watch'

export const GetItemWatches:Endpoint = {
  path: `${API_ROOT}`,
  method: Method.GET,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    const user = userContext.getUserOrThrow()
    return itemWatchDtoRetriever.retrieve({ userId: user.id })
  },
}

export const ActivateItemWatch:Endpoint = {
  path: `${API_ROOT}/action/activate`,
  method: Method.PUT,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    const request = jsonValidator.validate(req.body, itemWatchActivationSchema);
    const user = userContext.getUserOrThrow()
    return await itemWatchActivator.activate(user, request)
  },
}

export const DeactivateItemWatch:Endpoint = {
  path: `${API_ROOT}/action/deactivate`,
  method: Method.PUT,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    const request = jsonValidator.validate(req.body, itemWatchDeactivationSchema);
    const user = userContext.getUserOrThrow()
    return await itemWatchDeactivator.deactivate(user, request)
  },
}

export const GetItemWatchCount:Endpoint = {
  path: `${API_ROOT}/item/:itemId`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const itemId = req.params.itemId
    return await itemWatchCountRetriever.retrieve(itemId)
  },
}