import xmlbuilder from "xmlbuilder";
import express from "express";
import {PromiseRequestHandler, RequestHandler} from "./RequestHandler";

export enum ResponseFormat {
  JSON = 'JSON',
  XML = 'XML',
  STRING = 'STRING',
}

const map = (
  responsePromiseSupplier:PromiseRequestHandler,
  responseFormat: string = ResponseFormat.JSON
): RequestHandler => {

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const responsePromise = responsePromiseSupplier(req, res, next);
    responsePromise
      .then((responseResult: object|string|void) => {
        if (responseResult === undefined) {
          // Do not set anything in the response
        } else if (responseFormat === ResponseFormat.JSON) {
          res.json(responseResult);
        } else if (responseFormat === ResponseFormat.XML) {
          const xmlResponse = xmlbuilder.create( <{[name: string]:Object}> responseResult).end();
          res.set('Content-Type', 'text/xml');
          res.send(xmlResponse);
        } else { // responseFormat === ResponseFormat.STRING
          res.send(responseResult);
        }
      })
      .catch((err: any) => {
        if (err instanceof Error) {
          next(err);
          return;
        }
        next(new Error(JSON.stringify(err)));
      });
  }
};

export const promiseResponseMapper = {
  map,
};
