import {RequestHandler} from "./express/RequestHandler";
import {NotAuthorizedError} from "../error/NotAuthorizedError";
import {appHolder} from "./AppHolder";
import firebase from "firebase-admin";
import {userContext} from "./UserContext";
import {userRetriever} from "../domain/user/UserRetriever";
import {logger} from "firebase-functions";
import express, {NextFunction} from "express";
import {userMembershipQuerier} from "../domain/membership/UserMembershipQuerier";


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

const tryReadPreProcessedToken = (token:string):{firebaseUserId:string}|null => {
  // on some requests googles infrastructure will truncate the signature to prevent it being used for multiple repeat requests
  // in that scenario we assume that google has verified the signature and read the body
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

const verifyToken = (token:string, req:any, next:NextFunction) => {
  // const preProcessResult = tryReadPreProcessedToken(token)
  //
  // if (preProcessResult) {
  //   logger.info(`Found preprocess token for user: ${preProcessResult.firebaseUserId}`)
  //   userRetriever.retrieveByFirebaseUserId(preProcessResult.firebaseUserId)
  //     .then(user => {
  //       if (!user) {
  //         throw new NotAuthorizedError(`No user found matching id: ${preProcessResult.firebaseUserId}`);
  //       }
  //       userContext.setUser(user);
  //       next();
  //     })
  //     .catch(err => {
  //       logger.error(`Error while authenticating user`, err);
  //       next(new NotAuthorizedError(`Bad token`));
  //     })
  //   return
  // }

  const app = appHolder.getAdminApp();
  app.auth()
    .verifyIdToken(token)
    .then(async (value:firebase.auth.DecodedIdToken) => {
      const firebaseUserId = value.uid;
      const user = await userRetriever.retrieveByFirebaseUserId(firebaseUserId);
      if (!user) {
        throw new NotAuthorizedError(`No user found matching id: ${firebaseUserId}`);
      }
      userContext.setUser(user);
      next();
    })
    .catch(err => {
      logger.error(`Error while authenticating user`, err);
      next(new NotAuthorizedError(`Bad token`));
    })
}

const readAuthHeader = (req:express.Request):string|null => {
  const headers = req.headers;

  const authHeader = headers.authorization;
  if (authHeader && !authHeader.endsWith("SIGNATURE_REMOVED_BY_GOOGLE")) {
    return authHeader
  }

  const customAuthHeader = headers['x-custom-auth']
  if (customAuthHeader && typeof customAuthHeader === "string" && !customAuthHeader.endsWith("SIGNATURE_REMOVED_BY_GOOGLE")) {
    logger.info("Using custom auth header")
    return customAuthHeader
  }

  // if (authHeader && authHeader.endsWith("SIGNATURE_REMOVED_BY_GOOGLE")) {
  //   logger.warn("Falling back to PreProcessed auth token")
  //   return authHeader
  // }

  return null
}

export const USER_AUTH_HANDLER:RequestHandler = (req, res, next) => {

  const authHeader = readAuthHeader(req)
  if (!authHeader) {
    throw new NotAuthorizedError(`No Auth provided`);
  }
  const token = readToken(authHeader)
  verifyToken(token, req, next);
}

export const USER_OPTIONAL_AUTH_HANDLER:RequestHandler = (req, res, next) => {

  const authHeader = readAuthHeader(req)
  if (!authHeader) {
    next();
    return;
  }
  const token = readToken(authHeader)
  verifyToken(token, req, next);
}

export const PRO_USER_AUTH_HANDLER:RequestHandler = (req, res, next) => {
  const user = userContext.getUserOrThrow()
  if (!userMembershipQuerier.isPokePriceProUser(user)) {
    throw new NotAuthorizedError(`Not a pro user`);
  }
  next()
}