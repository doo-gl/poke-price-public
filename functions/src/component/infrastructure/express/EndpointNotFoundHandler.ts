import {RequestHandler} from "./RequestHandler";
import {NotFoundError} from "../../error/NotFoundError";


export const endpointNotFoundHandler:RequestHandler = (req, res, next) => {
  const err = new NotFoundError(`Path ${req.method} ${req.path} does not match a valid endpoint`);
  next(err);
}