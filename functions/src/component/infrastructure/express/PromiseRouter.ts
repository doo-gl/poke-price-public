import express from "express";
import {PromiseRequestHandler, RequestHandler} from "./RequestHandler";
import {promiseResponseMapper, ResponseFormat} from './PromiseResponseMapper';
import {logger} from "firebase-functions";

export interface EndpointAuth {
  authFns: Array<RequestHandler>,
  corsFn: RequestHandler|null
}

export interface Route {
  path:string,
  auth:EndpointAuth,
  routeFn:PromiseRequestHandler,
  responseFormat:ResponseFormat
}



type ExpressRouterMapper = (path: string, ...handlers: RequestHandler[]) => express.Router

export class PromiseRouter {

  private readonly _router:express.Router;

  constructor(
    readonly apiRoot:string = '',
  ) {
    this._router = express.Router();
  }

  get expressRouter():express.Router {
    return this._router
  }

  buildFullPath(path:string):string {
    return `${this.apiRoot}${path}`;
  }

  route(
    routerFn: (path: string, ...handlers: RequestHandler[]) => express.Router,
    path:string,
    authFns:Array<RequestHandler>,
    routeFn:PromiseRequestHandler,
    responseFormat:ResponseFormat,
  ):express.Router {
    if (!authFns || authFns.length === 0) {
      throw new Error('Cannot create a route with no authorisation defined');
    }
    if (!routeFn) {
      throw new Error('Cannot create route without a route function');
    }
    return routerFn(
      path,
      ...authFns,
      promiseResponseMapper.map(
        (req, res, next) => routeFn(req, res, next),
        responseFormat
      )
    );
  }

  _prependCorsToAuthFns(auth:EndpointAuth):Array<RequestHandler> {
    const authFns:Array<RequestHandler> = auth.authFns || [];
    if (!auth.corsFn) {
      return authFns;
    }
    return [auth.corsFn].concat(authFns);
  }



  get(path:string, auth:EndpointAuth, routeFn:PromiseRequestHandler, responseFormat:ResponseFormat = ResponseFormat.JSON):express.Router {
    const fullPath:string = this.buildFullPath(path);
    logger.info(`Registering route: GET ${fullPath}`);
    if (auth.corsFn) {
      this._router.options(fullPath, auth.corsFn);
    }
    const routerFn:ExpressRouterMapper = (routerPath, ...handlers) => this._router.get(routerPath, ...handlers);
    return this.route(
      routerFn,
      fullPath,
      this._prependCorsToAuthFns(auth),
      routeFn,
      responseFormat,
    );
  }

  post(path:string, auth:EndpointAuth, routeFn:PromiseRequestHandler, responseFormat:ResponseFormat = ResponseFormat.JSON):express.Router {
    const fullPath:string = this.buildFullPath(path);
    logger.info(`Registering route: POST ${fullPath}`);
    if (auth.corsFn) {
      this._router.options(fullPath, auth.corsFn);
    }
    const routerFn:ExpressRouterMapper = (routerPath, ...handlers) => this._router.post(routerPath, ...handlers);
    return this.route(
      routerFn,
      fullPath,
      this._prependCorsToAuthFns(auth),
      routeFn,
      responseFormat,
    );
  }

  put(path:string, auth:EndpointAuth, routeFn:PromiseRequestHandler, responseFormat:ResponseFormat = ResponseFormat.JSON):express.Router {
    const fullPath:string = this.buildFullPath(path);
    logger.info(`Registering route: PUT ${fullPath}`);
    if (auth.corsFn) {
      this._router.options(fullPath, auth.corsFn);
    }
    const routerFn:ExpressRouterMapper = (routerPath, ...handlers) => this._router.put(routerPath, ...handlers);
    return this.route(
      routerFn,
      fullPath,
      this._prependCorsToAuthFns(auth),
      routeFn,
      responseFormat,
    );
  }

}