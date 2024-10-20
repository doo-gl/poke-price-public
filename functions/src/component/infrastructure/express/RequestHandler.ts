import express from "express";

export type ErrorRequestHandler = (err:any, req: express.Request, res: express.Response, next: express.NextFunction) => void;
export type RequestHandler = (req: express.Request, res: express.Response, next: express.NextFunction) => void;
export type PromiseRequestHandler = (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<object|string|void>

export const NO_OP_HANDLER:RequestHandler = (req, res, next) => {
  next();
};