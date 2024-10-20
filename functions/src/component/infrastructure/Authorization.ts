import {NO_OP_HANDLER} from "./express/RequestHandler";
import {EndpointAuth} from "./express/PromiseRouter";
import cors from 'cors';
import {BASIC_REQUEST_PARAM_AUTH_HANDLER} from "./BasicAuthorization";
import {ADMIN_AUTH_HANDLER} from "./AdminAuthorization";
import {PRO_USER_AUTH_HANDLER, USER_AUTH_HANDLER, USER_OPTIONAL_AUTH_HANDLER} from "./UserAuthorization";
import {PUBLIC_API_AUTH_HANDLER} from "./PublicApiAuthorization";
import {TCG_API_INTEGRATION_AUTH_HANDLER} from "../domain/pokemon-tcg-api-integration/TcgApiIntegrationAuth";
import {isProduction} from "./ProductionDecider";

const ALLOWED_WEBAPP_ORIGINS = [
  'https://pokeprice.io',
  'https://pokeprice-webapp-dev.web.app',
]

const buildWebappCors = () => {
  const allowedOrigins = isProduction()
    ? ALLOWED_WEBAPP_ORIGINS
    : ["*"]

  const corsHandler = cors({
    origin: (requestOrigin, callback) => {

      callback(null, true)

      // const isAllowedOrigin = (requestOrigin && allowedOrigins.some(ori => requestOrigin === ori))
      //   || allowedOrigins.some(ori => ori === "*")
      // if (isAllowedOrigin) {
      //   callback(null, true)
      // } else {
      //   logger.warn(`Request from origin: ${requestOrigin} failed CORS check, allowed origins: [${allowedOrigins.join(', ')}]`)
      //   callback(new Error('Not authorized'))
      // }

    },
  })

  // const handler:RequestHandler = (req, res, next) => {
  //   logger.info(`FOO CALLING CORS HANDLER FOR REQUEST`)
  //
  //   next();
  // };

  return corsHandler
}

export const NO_AUTHORIZATION:EndpointAuth = {
  authFns: [NO_OP_HANDLER],
  corsFn: NO_OP_HANDLER,
};

export const ALLOW_ALL:EndpointAuth = {
  authFns: [NO_OP_HANDLER],
  corsFn: cors(),
};

export const BASIC_AUTH:EndpointAuth = {
  authFns: [BASIC_REQUEST_PARAM_AUTH_HANDLER],
  corsFn: NO_OP_HANDLER,
}

export const ADMIN_AUTH:EndpointAuth = {
  authFns: [ADMIN_AUTH_HANDLER],
  corsFn: cors(),
}

export const PUBLIC_API_AUTH:EndpointAuth = {
  authFns: [PUBLIC_API_AUTH_HANDLER],
  corsFn: cors(),
}

export const USER_AUTH:EndpointAuth = {
  authFns: [USER_AUTH_HANDLER],
  corsFn: cors(),
}

export const PRO_USER_AUTH:EndpointAuth = {
  authFns: [
    USER_AUTH_HANDLER,
    // as we shut pokeprice down, assume everyone is pro
    // PRO_USER_AUTH_HANDLER,
  ],
  corsFn: cors(),
}

export const USER_OPTIONAL_AUTH:EndpointAuth = {
  authFns: [USER_OPTIONAL_AUTH_HANDLER],
  corsFn: cors(),
}

export const BASIC_AUTH_WITH_CORS:EndpointAuth = {
  authFns: [BASIC_REQUEST_PARAM_AUTH_HANDLER],
  corsFn: cors(),
}

export const TCG_API_INTEGRATION_AUTH:EndpointAuth = {
  authFns: [TCG_API_INTEGRATION_AUTH_HANDLER],
  corsFn: NO_OP_HANDLER,
}

export const WEBAPP_ALLOW_ALL:EndpointAuth = {
  authFns: [NO_OP_HANDLER],
  corsFn: buildWebappCors(),
};

export const WEBAPP_USER_AUTH:EndpointAuth = {
  authFns: [USER_AUTH_HANDLER],
  corsFn: buildWebappCors(),
}

export const WEBAPP_PRO_USER_AUTH:EndpointAuth = {
  authFns: [
    USER_AUTH_HANDLER,
    // as we shut pokeprice down, assume everyone is pro
    // PRO_USER_AUTH_HANDLER,
  ],
  corsFn: buildWebappCors(),
}

export const WEBAPP_USER_OPTIONAL_AUTH:EndpointAuth = {
  authFns: [USER_OPTIONAL_AUTH_HANDLER],
  corsFn: buildWebappCors(),
}