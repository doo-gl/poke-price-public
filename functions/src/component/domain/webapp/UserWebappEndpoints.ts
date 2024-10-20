import {Request} from "express";
import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {ALLOW_ALL, USER_AUTH, WEBAPP_ALLOW_ALL, WEBAPP_USER_AUTH} from "../../infrastructure/Authorization";
import {userCreator} from "../user/UserCreator";
import {JSONSchemaType} from "ajv";
import {jsonValidator} from "../../tools/JsonValidator";
import {userSessionStarter} from "../user/UserSessionStarter";
import {userSignUpProcessor} from "../user/UserSignUpProcessor";
import {userLogInProcessor} from "../user/UserLogInProcessor";
import {facebookLogInProcessor} from "../user/FacebookLogInProcessor";
import {tokenRefresher} from "../user/TokenRefresher";
import {currentUserRetriever} from "../user/CurrentUserRetriever";
import {EmailType} from "../user/UserEntity";
import {userEmailSubscriber} from "../user/UserEmailUnsubscriber";
import {userContext} from "../../infrastructure/UserContext";
import {userPasswordResetter} from "../user/UserPasswordResetter";
import {CurrencyCode} from "../money/CurrencyCodes";
import {userCurrencyUpdater} from "../user/UserCurrencyUpdater";
import {userDtoMapper} from "../user/UserDtoMapper";
import {CreateUserEventRequest, userEventCreator} from "../user/event/UserEventCreator";
import {firebaseUserDetailProcessor} from "../user/FirebaseUserDetailProcessor";
import {FirebaseUserDetails} from "../user/PostLogInUserCredentialProcessor";
import {percentileDetailCalculator} from "../card-ownership/stats/PercentileDetailCalculator";
import {UpdateUsernameRequest, usernameUpdater} from "../user/UsernameUpdater";

export const API_ROOT = '/user';

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
  path: `${API_ROOT}/anonymous`,
  method: Method.POST,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const caller = extractCallerDetails(req)
    return userCreator.anonymous(caller);
  },
}

interface StartSessionBody {
  userId:string,
  startPath?:string,
  referrer?:string,
}
const startSessionSchema:JSONSchemaType<StartSessionBody> = {
  type: "object",
  properties: {
    userId: { type: "string" },
    startPath: { type: "string", nullable: true },
    referrer: { type: "string", nullable: true },
  },
  additionalProperties: false,
  required: ["userId"],
}
export const StartSession:Endpoint = {
  path: `${API_ROOT}/session`,
  method: Method.POST,
  auth: WEBAPP_ALLOW_ALL,
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
  sessionId:string,
  newPath?:string,
}
const sendBeaconSchema:JSONSchemaType<SendBeaconBody> = {
  type: "object",
  properties: {
    userId: { type: "string" },
    sessionId: { type: "string" },
    newPath: { type: "string", nullable: true },
  },
  additionalProperties: false,
  required: ["userId", "sessionId"],
}
export const SendBeacon:Endpoint = {
  path: `${API_ROOT}/session/action/send-beacon`,
  method: Method.PUT,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const body = jsonValidator.validate(req.body, sendBeaconSchema);
    const caller = extractCallerDetails(req);
    return userSessionStarter.receiveBeacon({
      ...body,
      ...caller,
    });
  },
}

export interface SignUpBody {
  email:string,
  password:string,
  acceptedTerms:boolean,
  acceptedMarketing:boolean,
  anonymousUserId:string|null,
  anonymousSessionId:string|null,
}
const signUpSchema:JSONSchemaType<SignUpBody> = {
  type: "object",
  properties: {
    email: { type: "string" },
    password: { type: "string" },
    acceptedTerms: { type: "boolean" },
    acceptedMarketing: { type: "boolean" },
    anonymousUserId: { type: "string", nullable: true },
    anonymousSessionId: { type: "string", nullable: true },
  },
  additionalProperties: false,
  required: ["email", "password", "acceptedTerms", "acceptedMarketing"],
}
export const SignUp:Endpoint = {
  path: `${API_ROOT}/action/sign-up`,
  method: Method.POST,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const body = jsonValidator.validate(req.body, signUpSchema);
    const caller = extractCallerDetails(req);
    return userSignUpProcessor.process({
      ...body,
      ...caller,
    });
  },
}

export interface LogInBody {
  email:string,
  password:string,
  anonymousUserId:string|null
  anonymousSessionId:string|null,
}
const logInSchema:JSONSchemaType<LogInBody> = {
  type: "object",
  properties: {
    email: { type: "string" },
    password: { type: "string" },
    anonymousUserId: { type: "string", nullable: true },
    anonymousSessionId: { type: "string", nullable: true },
  },
  additionalProperties: false,
  required: ["email", "password"],
}
export const LogIn:Endpoint = {
  path: `${API_ROOT}/action/log-in`,
  method: Method.POST,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const body = jsonValidator.validate(req.body, logInSchema);
    const caller = extractCallerDetails(req);
    return userLogInProcessor.process({
      ...body,
      ...caller,
    });
  },
}

export interface FacebookLogInBody {
  facebookAccessToken: string,
  facebookUserId: string,
  anonymousUserId:string|null
  anonymousSessionId:string|null,
}
const logInWithFacebookSchema:JSONSchemaType<FacebookLogInBody> = {
  type: "object",
  properties: {
    facebookUserId: { type: "string" },
    facebookAccessToken: { type: "string" },
    anonymousUserId: { type: "string", nullable: true },
    anonymousSessionId: { type: "string", nullable: true },
  },
  additionalProperties: false,
  required: ["facebookAccessToken", "facebookUserId"],
}
export const LogInWithFacebook:Endpoint = {
  path: `${API_ROOT}/action/facebook-log-in`,
  method: Method.POST,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const body = jsonValidator.validate(req.body, logInWithFacebookSchema);
    const caller = extractCallerDetails(req);
    return facebookLogInProcessor.logIn({
      ...body,
      ...caller,
    });
  },
}

export interface FirebaseUserDetailsRequest extends FirebaseUserDetails {
  facebookUserId:string|null,
  anonymousUserId:string|null
  anonymousSessionId:string|null,
}

const firebaseUserDetailsSchema:JSONSchemaType<FirebaseUserDetailsRequest> = {
  type: "object",
  properties: {
    uid: { type: "string" },
    displayName: { type: "string" },
    email: { type: "string" },
    photoUrl: { type: "string", nullable: true },
    facebookUserId: { type: "string", nullable: true },
    anonymousUserId: { type: "string", nullable: true },
    anonymousSessionId: { type: "string", nullable: true },
  },
  additionalProperties: false,
  required: ["uid", "displayName", "email"],
}

export const ProcessFirebaseUserDetails:Endpoint = {
  path: `${API_ROOT}/action/process-firebase-credentials`,
  method: Method.POST,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const body = jsonValidator.validate(req.body, firebaseUserDetailsSchema);
    const caller = extractCallerDetails(req);
    return firebaseUserDetailProcessor.process(body, caller)
  },
}

export const IsLoggedIn:Endpoint = {
  path: `${API_ROOT}/action/is-logged-in`,
  method: Method.GET,
  auth: WEBAPP_USER_AUTH,
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
  path: `${API_ROOT}/action/refresh-token`,
  method: Method.PUT,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const body = jsonValidator.validate(req.body, refreshTokenSchema);
    return tokenRefresher.refresh(body);
  },
}

export const GetCurrentUser:Endpoint = {
  path: `${API_ROOT}/action/get-current`,
  method: Method.GET,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    return await currentUserRetriever.retrieve();
  },
}

interface UnsubscribeFromEmailRequest {
  emailType:EmailType,
}
const unsubscribeFromEmailSchema:JSONSchemaType<UnsubscribeFromEmailRequest> = {
  type: "object",
  properties: {
    emailType: { type: "string" },
  },
  additionalProperties: false,
  required: ["emailType"],
}
export const UnsubscribeFromEmail:Endpoint = {
  path: `${API_ROOT}/action/unsubscribe-from-email`,
  method: Method.PUT,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    const body = jsonValidator.validate(req.body, unsubscribeFromEmailSchema);
    const user = userContext.getUserOrThrow()
    return userEmailSubscriber.unsubscribe(user, [body.emailType])
  },
}

interface SubscribeToEmailRequest {
  emailType:EmailType,
}
const subscribeToEmailSchema:JSONSchemaType<SubscribeToEmailRequest> = {
  type: "object",
  properties: {
    emailType: { type: "string" },
  },
  additionalProperties: false,
  required: ["emailType"],
}
export const SubscribeToEmail:Endpoint = {
  path: `${API_ROOT}/action/subscribe-to-email`,
  method: Method.PUT,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    const body = jsonValidator.validate(req.body, subscribeToEmailSchema);
    const user = userContext.getUserOrThrow()
    return userEmailSubscriber.subscribe(user, [body.emailType])
  },
}

export interface ResetPasswordBody {
  email:string,
  anonymousUserId:string|null
}
const resetPasswordSchema:JSONSchemaType<ResetPasswordBody> = {
  type: "object",
  properties: {
    email: { type: "string" },
    anonymousUserId: { type: "string", nullable: true },
  },
  additionalProperties: false,
  required: ["email"],
}
export const ResetPassword:Endpoint = {
  path: `${API_ROOT}/action/reset-password`,
  method: Method.PUT,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const body = jsonValidator.validate(req.body, resetPasswordSchema);
    await userPasswordResetter.reset(body);
    return {}
  },
}

export interface UpdateUserCurrencyRequest {
  currencyCode:CurrencyCode,
}
const updateUserCurrencySchema:JSONSchemaType<UpdateUserCurrencyRequest> = {
  type: "object",
  properties: {
    currencyCode: { type: "string", anyOf: Object.keys(CurrencyCode).map(code => ({ const: code })) },
  },
  additionalProperties: false,
  required: ["currencyCode"],
}
export const UpdateUserCurrency:Endpoint = {
  path: `${API_ROOT}/action/update-currency`,
  method: Method.PUT,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    const body = jsonValidator.validate(req.body, updateUserCurrencySchema);
    const user = userContext.getUserOrThrow()
    const updatedUser = await userCurrencyUpdater.update(user.id, body.currencyCode)
    return userDtoMapper.mapCurrent(updatedUser);
  },
}

const sendUserEventSchema:JSONSchemaType<CreateUserEventRequest> = {
  type: "object",
  properties: {
    userId: { type: "string" },
    sessionId: { type: "string" },
    path: { type: "string", nullable: true },
    eventName: { type: "string" },
    eventDetails: {
      type: "object",
      required: [],
    },
  },
  additionalProperties: false,
  required: ["userId", "sessionId", "eventName", "eventDetails", "path"],
}
export const SendUserEvent:Endpoint = {
  path: `${API_ROOT}/event/action/send-event`,
  method: Method.PUT,
  auth: WEBAPP_ALLOW_ALL,
  requestHandler: async (req, res, next) => {
    const body = jsonValidator.validate(req.body, sendUserEventSchema);
    await userEventCreator.create({
      userId: body.userId,
      sessionId: body.sessionId,
      eventName: body.eventName,
      path: body.path,
      eventDetails: body.eventDetails,
    })
    return {}
  },
}

export const GetCurrentUserPercentiles:Endpoint = {
  path: `${API_ROOT}/action/get-current-percentiles`,
  method: Method.GET,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    const user = userContext.getUserOrThrow()
    const percentileDetails = await percentileDetailCalculator.calculate(user.id, [])
    return {
      percentiles: percentileDetails?.userPercentile ?? null,
    }
  },
}

const updateUsernameSchema:JSONSchemaType<UpdateUsernameRequest> = {
  type: "object",
  properties: {
    username: { type: "string" },
  },
  additionalProperties: false,
  required: ["username"],
}
export const UpdateUsername:Endpoint = {
  path: `${API_ROOT}/action/update-username`,
  method: Method.PUT,
  auth: WEBAPP_USER_AUTH,
  requestHandler: async (req, res, next) => {
    const user = userContext.getUserOrThrow()
    const request = jsonValidator.validate(req.body, updateUsernameSchema);
    const response = await usernameUpdater.update(user, request)
    return response
  },
}