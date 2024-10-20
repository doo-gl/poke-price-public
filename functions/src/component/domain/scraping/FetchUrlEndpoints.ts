import {JSONSchemaType} from "ajv";
import {Endpoint} from "../../infrastructure/express/Endpoint";
import {BASIC_AUTH} from "../../infrastructure/Authorization";
import {jsonValidator} from "../../tools/JsonValidator";
import {headlessBrowser} from "../../infrastructure/HeadlessBrowser";
import {ResponseFormat} from "../../infrastructure/express/PromiseResponseMapper";
import {baseExternalClient, Method} from "../../client/BaseExternalClient";
import {ExternalClientError} from "../../error/ExternalClientError";
import {logger} from "firebase-functions";

export interface FetchUrlRequest {
  url:string
}
export const fetchUrlSchema:JSONSchemaType<FetchUrlRequest> = {
  type: "object",
  properties: {
    url: { type: "string" },
  },
  additionalProperties: false,
  required: ["url"],
}
export const FetchUrl:Endpoint = {
  path: '',
  method: Method.POST,
  auth: BASIC_AUTH,
  requestHandler: async (req, res, next) => {
    const request = jsonValidator.validate(req.body, fetchUrlSchema);
    const result = await headlessBrowser.loadUrl(request.url)
    res.status(result.status)
    return result.content
  },
  responseFormat: ResponseFormat.STRING,
}

export const FetchUrlBasic:Endpoint = {
  path: '',
  method: Method.POST,
  auth: BASIC_AUTH,
  requestHandler: async (req, res, next) => {
    const request = jsonValidator.validate(req.body, fetchUrlSchema);
    const requestId = req.query.requestId ?? null
    try {
      logger.info(`Request starting: ${request.url} - ${requestId}`)
      const result = await baseExternalClient.request(request.url, Method.GET, null, null, null)
      res.status(result.status)
      const content = result.data
      logger.info(`Request successful: ${request.url} - ${requestId} - ${result.status} - ${content?.length ? content?.length : ""}`)
      return content ?? ""
    } catch(err:any) {
      if (err instanceof ExternalClientError) {
        logger.error(`Request failed with client error: ${err.message} - ${request.url} - ${requestId} - ${err.responseStatus} - ${err.responseBody?.length ? err.responseBody?.length : ""}`)
        res.status(err.responseStatus ?? 500)
        return err.responseBody ?? ""
      }
      logger.error(`Request failed with unknown error: ${err.message} - ${request.url} - ${requestId}`)
      throw err
    }
  },
  responseFormat: ResponseFormat.STRING,
}