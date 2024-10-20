import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {ALLOW_ALL, USER_AUTH} from "../../infrastructure/Authorization";
import {userCreator} from "./UserCreator";
import {userSessionStarter} from "./UserSessionStarter";
import {JSONSchemaType} from "ajv";
import {jsonValidator} from "../../tools/JsonValidator";
import {userSignUpProcessor} from "./UserSignUpProcessor";
import {userLogInProcessor} from "./UserLogInProcessor";
import {tokenRefresher} from "./TokenRefresher";
import {currentUserRetriever} from "./CurrentUserRetriever";
import {facebookLogInProcessor} from "./FacebookLogInProcessor";
import {Request} from 'express';
import {CurrencyCode} from "../money/CurrencyCodes";
import {CardVariant} from "../card/CardEntity";

export interface CallerDetails {
  ipAddress:string|null,
  userAgent:string|null,
  origin:string|null,
}

const extractCallerDetails = (req:Request):CallerDetails => {
  const ipAddress = req.header('x-forwarded-for');
  const userAgent = req.header('user-agent');
  const origin = req.header('origin');
  return {
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    origin: origin || null,
  }
}

export const CreateAnonymous:Endpoint = {
  path: '',
  method: Method.POST,
  auth: ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const caller = extractCallerDetails(req)
    return userCreator.anonymous(caller);
  },
}

interface StartSessionBody {
  userId:string,
}
const startSessionSchema:JSONSchemaType<StartSessionBody> = {
  type: "object",
  properties: {
    userId: { type: "string" },
  },
  additionalProperties: false,
  required: ["userId"],
}
export const StartSession:Endpoint = {
  path: '',
  method: Method.POST,
  auth: ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const body = jsonValidator.validate(req.body, startSessionSchema);
    const caller = extractCallerDetails(req)
    return userSessionStarter.start({
      ...body,
      ...caller,
    });
  },
}


interface SendBeaconBody {
  userId:string,
  sessionId:string
}
const sendBeaconSchema:JSONSchemaType<SendBeaconBody> = {
  type: "object",
  properties: {
    userId: { type: "string" },
    sessionId: { type: "string" },
  },
  additionalProperties: false,
  required: ["userId", "sessionId"],
}
export const SendBeacon:Endpoint = {
  path: '',
  method: Method.PUT,
  auth: ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const body = jsonValidator.validate(req.body, sendBeaconSchema);
    const caller = extractCallerDetails(req);
    return userSessionStarter.receiveBeacon({
      ...body,
      ...caller,
    });
  },
}


export const IsLoggedIn:Endpoint = {
  path: '',
  method: Method.GET,
  auth: USER_AUTH,
  requestHandler: async (req, res, next) => {
    return {}
  },
}

export interface RefreshTokenBody {
  refreshToken:string,
}
const refreshTokenSchema:JSONSchemaType<RefreshTokenBody> = {
  type: "object",
  properties: {
    refreshToken: { type: "string" },
  },
  additionalProperties: false,
  required: ["refreshToken"],
}
export const RefreshToken:Endpoint = {
  path: '',
  method: Method.PUT,
  auth: ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const body = jsonValidator.validate(req.body, refreshTokenSchema);
    return tokenRefresher.refresh(body);
  },
}

export const GetCurrentUser:Endpoint = {
  path: '',
  method: Method.GET,
  auth: USER_AUTH,
  requestHandler: async (req, res, next) => {
    return await currentUserRetriever.retrieve();
  },
}