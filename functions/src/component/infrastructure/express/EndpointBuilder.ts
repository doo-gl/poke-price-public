import {UnexpectedError} from "../../error/UnexpectedError";

import {Endpoint, Method} from "./Endpoint";
import express, {Express} from "express";
import {EndpointAuth} from "./PromiseRouter";
import {PromiseRequestHandler, RequestHandler} from "./RequestHandler";
import {promiseResponseMapper, ResponseFormat} from "./PromiseResponseMapper";
import bodyParser from "body-parser";

import {databaseStatsLogger} from "./DatabaseStatsLogger";
import {userContext} from "../UserContext";
import {endpointNotFoundHandler} from "./EndpointNotFoundHandler";
import {errorToHttpResponseHandler} from "./ErrorToHttpResponseHandler";
import {errorRequestHandler} from "./ErrorRequestHandler";

import {errorMappings} from "../../error/ErrorMappings";
import {logger} from "firebase-functions";


const listAuthorizationHandlers = (auth:EndpointAuth):Array<RequestHandler> => {
  const handlers:Array<RequestHandler> = [];
  if (auth.corsFn) {
    handlers.push(auth.corsFn);
  }
  return handlers.concat(auth.authFns);
}

const createRouter = (endpoint:Endpoint):express.Router => {
  logger.info(`Endpoint Starting: ${endpoint.method} - ${endpoint.path}`)
  const router = express.Router();
  if (endpoint.preMiddleware && endpoint.preMiddleware.length > 0) {
    router.use(endpoint.preMiddleware);
  }
  if (endpoint.auth.corsFn) {
    router.options(endpoint.path, endpoint.auth.corsFn);
  }

  const authHandlers = listAuthorizationHandlers(endpoint.auth);
  const responseFormat = endpoint.responseFormat || ResponseFormat.JSON;
  const requestHandler:PromiseRequestHandler = (req, res, next) => endpoint.requestHandler(req, res, next);

  if (endpoint.method === Method.GET) {
    router.get(
      endpoint.path,
      ...authHandlers,
      promiseResponseMapper.map(requestHandler, responseFormat)
    );
    return router;
  } else if (endpoint.method === Method.POST) {
    router.post(
      endpoint.path,
      ...authHandlers,
      promiseResponseMapper.map(requestHandler, responseFormat)
    );
    return router;
  } else if (endpoint.method === Method.PUT) {
    router.put(
      endpoint.path,
      ...authHandlers,
      promiseResponseMapper.map(requestHandler, responseFormat)
    );
    return router;
  } else if (endpoint.method === Method.DELETE) {
    router.delete(
      endpoint.path,
      ...authHandlers,
      promiseResponseMapper.map(requestHandler, responseFormat)
    );
    return router;
  }
  throw new UnexpectedError(`Do not recognise method: ${endpoint.method}`);
}

const buildApp = (endpoints:Array<Endpoint>, options?:{preMiddleware?:Array<RequestHandler>}) => {
  const app:Express = express();
  app.disable('x-powered-by');

  if (options?.preMiddleware) {
    options?.preMiddleware?.forEach(preMiddlewareHandler => {
      app.use(preMiddlewareHandler)
    })
  }
  app.use(bodyParser.json() as RequestHandler);
  app.use(bodyParser.urlencoded({ extended: false }) as RequestHandler);
  app.use(databaseStatsLogger.middleware);
  app.use(userContext.middleware);

  endpoints.forEach(endpoint => {
    const router = createRouter(endpoint);
    app.use(router);
  })

  app.use(endpointNotFoundHandler);
  errorMappings.init();
  app.use(errorToHttpResponseHandler.handle);
  app.use(errorRequestHandler);
  return app;
}

export const endpointBuilder = {
  buildApp,
}