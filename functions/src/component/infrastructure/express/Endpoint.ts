import {EndpointAuth} from "./PromiseRouter";
import {ResponseFormat} from "./PromiseResponseMapper";
import {PromiseRequestHandler, RequestHandler} from "./RequestHandler";

export enum Method {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE'
}

export interface Endpoint {
  method:Method,
  path:string,
  auth:EndpointAuth,
  requestHandler:PromiseRequestHandler,
  responseFormat?:ResponseFormat,
  preMiddleware?:Array<RequestHandler>
}

