import {RequestHandler} from "./express/RequestHandler";
import {NotAuthorizedError} from "../error/NotAuthorizedError";
import {appHolder} from "./AppHolder";
import firebase from "firebase-admin";
import {adminUserRetriever} from "../domain/admin/admin-user/AdminUserRetriever";
import {userContext} from "./UserContext";
import {logger} from "firebase-functions";

export const ADMIN_ROLE = 'ADMIN';

const tryReadPreProcessedToken = (token:string):{firebaseUserId:string}|null => {
  if (!token.endsWith("SIGNATURE_REMOVED_BY_GOOGLE")) {
    return null
  }
  const split = token.split('.')
  if (split.length !== 3) {
    throw new NotAuthorizedError(`Bad Auth format, token preprocessed but not 3 tokens long, actual length: ${split.length}`)
  }
  const encodedBody = split[1]
  try {
    const decodedBody = Buffer.from(encodedBody, "base64").toString("utf-8")
    const bodyJson = JSON.parse(decodedBody)
    return {firebaseUserId: bodyJson.user_id}
  } catch (err:any) {
    logger.error("Failed to decode token body", err)
    throw new NotAuthorizedError(`Bad Auth format, Failed to decode token body`)
  }
}

export const ADMIN_AUTH_HANDLER:RequestHandler = (req, res, next) => {
  // read the id token from the Authorization header
  // check the claims of the token
  // if one of the claims is admin, allow, else, reject
  const headers = req.headers;
  const authHeader = headers.authorization;
  if (!authHeader) {
    throw new NotAuthorizedError(`No Auth provided`);
  }
  const split = authHeader.split(' ');
  if (split.length !== 2 || split[0].toLowerCase() !== 'bearer') {
    throw new NotAuthorizedError(`Bad Auth format, expected: Bearer TOKEN`)
  }
  const token = split[1];

  const preProcessResult = tryReadPreProcessedToken(token)
  if (preProcessResult) {
    adminUserRetriever.retrieveByAuthId(preProcessResult.firebaseUserId)
      .then((adminUser) => {
        if (!adminUser || !adminUser.roles.some(role => role === ADMIN_ROLE)) {
          throw new NotAuthorizedError(`Not an admin`);
        }
        userContext.setAdminUser(adminUser);
        next();
      })
      .catch(err => {
        next(err);
      })
    return
  }

  const app = appHolder.getAdminApp();
  app.auth()
    .verifyIdToken(token)
    .then((value:firebase.auth.DecodedIdToken) => {
      const authId = value.uid;
      return adminUserRetriever.retrieveByAuthId(authId)
    })
    .then((adminUser) => {
      if (!adminUser || !adminUser.roles.some(role => role === ADMIN_ROLE)) {
        throw new NotAuthorizedError(`Not an admin`);
      }
      userContext.setAdminUser(adminUser);
      next();
    })
    .catch(err => {
      next(err);
    })
}