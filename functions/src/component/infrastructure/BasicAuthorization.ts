import {RequestHandler} from "./express/RequestHandler";
import {BasicAuthError} from "../error/BasicAuthError";
import {configRetriever} from "./ConfigRetriever";

export const BASIC_REQUEST_PARAM_AUTH_HANDLER:RequestHandler = (req, res, next) => {
  const config = configRetriever.retrieve();
  const requestKey = req.query['basicAuth']
  if (config.basicAuthKey() !== requestKey) {
    throw new BasicAuthError('bad key');
  }
  next();
}
