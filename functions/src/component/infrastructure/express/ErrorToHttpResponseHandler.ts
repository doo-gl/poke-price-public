import {ErrorRequestHandler} from "./RequestHandler";
import express from "express";
import {NotFoundError} from "../../error/NotFoundError";
import {logger} from "firebase-functions";

export type ErrorMatcher = (err:any, res:express.Request, req:express.Response) => boolean;
export type ResponseMutator = (err:any, res:express.Request, req:express.Response) => void;

export type ErrorMapper = {
  predicate:ErrorMatcher,
  mutator:ResponseMutator,
}

export const mapToStatus = (predicate:ErrorMatcher, status:number):ErrorMapper => {
  return {
    predicate: predicate,
    mutator: (err, req, res) => {
      res.status(status);
      if (err.details) {
        res.json({
          name: err.name,
          message: err.message,
          details: err.details,
        });
      } else {
        res.json({
          name: err.name,
          message: err.message,
        });
      }
    },
  }
};

export const mapTypeToStatus = (type:any, status:number):ErrorMapper => {
  return mapToStatus(
    (err, req, res) => err instanceof type,
    status
  );
};

export const mapMessageToStatus = (message:string, status:number):ErrorMapper => {
  return mapToStatus(
    (err, req, res) => err.message === message,
    status
  );
};

export const mapRegexToStatus = (regex:RegExp, status:number):ErrorMapper => {
  return mapToStatus(
    (err, req, res) => err.message.match(regex),
    status
  )
};

const ERROR_MAPPERS:Array<ErrorMapper> = [
  mapTypeToStatus(NotFoundError, 404),
];

const registerErrorMapper = (errorMapper:ErrorMapper) => {
  ERROR_MAPPERS.push(errorMapper);
}

const handle:ErrorRequestHandler = (err, req, res, next) => {

  // map recognised errors to responses, else pass the error on.
  const chosenMapper = ERROR_MAPPERS.find(mapper => mapper.predicate(err, req, res));

  if (chosenMapper) {
    logger.error("Request Failed", err);
    chosenMapper.mutator(err, req, res);
    return;
  }
  next(err);
};

export const errorToHttpResponseHandler = {
  handle,
  registerErrorMapper,
}