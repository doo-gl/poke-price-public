import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {PUBLIC_API_AUTH} from "../../infrastructure/Authorization";
import {GetManyCardRequest, publicApiCardRetriever} from "./PublicApiCardRetriever";
import {optionalNumber, optionalString, readParams} from "../../tools/QueryParamReader";
import {GetManySetRequest, publicApiSetRetriever} from "./PublicApiSetRetriever";


export const GetOneCard:Endpoint = {
  path: '/card/:id',
  method: Method.GET,
  auth: PUBLIC_API_AUTH,
  requestHandler: async (req, res, next) => {
    const cardId = req.params.id
    return publicApiCardRetriever.getOne(cardId)
  },
}
export const GetManyCards:Endpoint = {
  path: '/card',
  method: Method.GET,
  auth: PUBLIC_API_AUTH,
  requestHandler: async (req, res, next) => {
    const request:GetManyCardRequest = readParams(req.query, {
      series: optionalString(),
      set: optionalString(),
      setId: optionalString(),
      name: optionalString(),
      cardNumber: optionalString(),
      setNumber: optionalString(),
      variant: optionalString(),
      pageIndex: optionalNumber(),
      limit: optionalNumber(),
    })
    return publicApiCardRetriever.getMany(request)
  },
}

export const GetOneSet:Endpoint = {
  path: '/set/:id',
  method: Method.GET,
  auth: PUBLIC_API_AUTH,
  requestHandler: async (req, res, next) => {
    const setId = req.params.id
    return publicApiSetRetriever.getOne(setId)
  },
}
export const GetManySets:Endpoint = {
  path: '/set',
  method: Method.GET,
  auth: PUBLIC_API_AUTH,
  requestHandler: async (req, res, next) => {
    const request:GetManySetRequest = readParams(req.query, {
      series: optionalString(),
      set: optionalString(),
      fromId: optionalString(),
      limit: optionalNumber(),
    })
    return publicApiSetRetriever.getMany(request)
  },
}