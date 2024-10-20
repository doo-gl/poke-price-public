import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {PRO_USER_AUTH, USER_AUTH, WEBAPP_ALLOW_ALL, WEBAPP_USER_AUTH} from "../../infrastructure/Authorization";
import {userContext} from "../../infrastructure/UserContext";
import {portfolioStatsRefreshRequester} from "../portfolio/PortfolioStatsRefreshRequester";
import {portfolioStatsDtoRetriever} from "../portfolio/PortfolioStatsDtoRetriever";
import {publicPortfolioRetriever} from "../portfolio/public/PublicPortfolioRetriver";
import {JSONSchemaType} from "ajv";
import {jsonValidator} from "../../tools/JsonValidator";
import {publicPortfolioVisibilityUpdater} from "../portfolio/public/PublicPortfolioVisibilityUpdater";


export const API_ROOT = '/portfolio'

export const GetPortfolioStats:Endpoint = {
  path: `${API_ROOT}/stats/current-user`,
  method: Method.GET,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    const user = userContext.getUserOrThrow();
    return await portfolioStatsDtoRetriever.retrieveByUserId(user.id)
  },
}

export const RequestPortfolioStatsRefresh:Endpoint = {
  path: `${API_ROOT}/stats/current-user/action/request-refresh`,
  method: Method.PUT,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    const user = userContext.getUserOrThrow();
    await portfolioStatsRefreshRequester.request(user.id)
    return {}
  },
}

export const GetPublicPortfolio:Endpoint = {
  path: `${API_ROOT}/stats/public/:portfolioId`,
  method: Method.GET,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const portfolioId = req.params['portfolioId']
    return await publicPortfolioRetriever.retrieve(portfolioId)
  },
}

export interface UpdatePortfolioVisibilityRequest {
  isPublic:boolean
}
const updatePortfolioVisibilitySchema:JSONSchemaType<UpdatePortfolioVisibilityRequest> = {
  type: "object",
  properties: {
    isPublic: { type: "boolean" },
  },
  additionalProperties: false,
  required: ['isPublic'],
}
export const UpdatePortfolioVisibility:Endpoint = {
  path: `${API_ROOT}/stats/:portfolioId/action/update-visibility`,
  method: Method.PUT,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    const portfolioId = req.params['portfolioId']
    const request = jsonValidator.validate(req.body, updatePortfolioVisibilitySchema)
    if (request.isPublic) {
      await publicPortfolioVisibilityUpdater.makePortfolioPublic(portfolioId)
    } else {
      await publicPortfolioVisibilityUpdater.makePortfolioPrivate(portfolioId)
    }
    return portfolioStatsDtoRetriever.retrieve(portfolioId)
  },
}