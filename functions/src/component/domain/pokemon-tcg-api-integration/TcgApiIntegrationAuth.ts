import {NotAuthorizedError} from "../../error/NotAuthorizedError";
import {RequestHandler} from "../../infrastructure/express/RequestHandler";
import {configRetriever} from "../../infrastructure/ConfigRetriever";
import {UnexpectedError} from "../../error/UnexpectedError";


const readToken = (authHeader:string):string => {
  const split = authHeader.split(' ');
  if (split.length !== 2) {
    throw new NotAuthorizedError(`Bad Auth format, expected: Bearer TOKEN, actual header has split length: ${split.length}`)
  }
  if (split[0].toLowerCase() !== 'bearer') {
    const exampleText = split[0].length <= 10 ? split[0] : `${split[0].slice(0, 5)}...${split[0].slice(split[0].length - 5, split[0].length)}`
    throw new NotAuthorizedError(`Bad Auth format, expected: Bearer TOKEN, actual header has first token "${exampleText}"`)
  }
  const token = split[1];
  return token;
}

export const TCG_API_INTEGRATION_AUTH_HANDLER:RequestHandler = (req, res, next) => {
  const headers = req.headers;
  const authHeader = headers.authorization;
  if (!authHeader) {
    throw new NotAuthorizedError(`Bad Auth format, expected Authorization header`)
  }
  const token = readToken(authHeader)
  const config = configRetriever.retrieve()
  const tcgApiIntegrationToken = config.tcgApiIntegrationToken()
  if (!tcgApiIntegrationToken) {
    throw new UnexpectedError("Security has not been configured")
  }
  if (token !== tcgApiIntegrationToken) {
    throw new NotAuthorizedError("Bad Auth Token")
  }
  next()
}