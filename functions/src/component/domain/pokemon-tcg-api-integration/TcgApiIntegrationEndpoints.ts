import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {TCG_API_INTEGRATION_AUTH} from "../../infrastructure/Authorization";
import {nonNullString, readParam} from "../../tools/QueryParamReader";
import {tcgApiIntegrationCardRetriever} from "./TcgApiIntegrationCardRetriever";


export const API_ROOT = '/tcg-api-integration'

export const GetTcgApiCards:Endpoint = {
  path: `${API_ROOT}/card`,
  method: Method.GET,
  auth: TCG_API_INTEGRATION_AUTH,
  requestHandler: async (req, res, next) => {
    const tcgApiSetId = readParam(req.query, "tcgApiSetId", nonNullString())
    return tcgApiIntegrationCardRetriever.retrieveForTcgApiSetId(tcgApiSetId)
  },
}

export const GetTcgApiCard:Endpoint = {
  path: `${API_ROOT}/card/:tcgApiCardId`,
  method: Method.GET,
  auth: TCG_API_INTEGRATION_AUTH,
  requestHandler: async (req, res, next) => {
    const tcgApiCardId = req.params['tcgApiCardId']
    return tcgApiIntegrationCardRetriever.retrieveForTcgApiCardId(tcgApiCardId)
  },
}

export const TcgApiIntegrationEndpoints = [
  GetTcgApiCards,
  GetTcgApiCard,
]



