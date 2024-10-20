import {SignUpValidationError, SignUpValidationErrorCode} from "../../error/SignUpValidationError";
import {userDtoMapper} from "./UserDtoMapper";
import {userAssociator} from "./UserAssociator";
import {LogInResponse} from "./UserLogInProcessor";
import {firebaseLogInManager} from "./FirebaseLogInManager";
import {postLogInUserCredentialProcessor} from "./PostLogInUserCredentialProcessor";
import {CallerDetails, SignUpBody} from "../webapp/UserWebappEndpoints";

export interface SignUpRequest extends SignUpBody, CallerDetails {}

const process = async (request:SignUpRequest):Promise<LogInResponse> => {
  if (!request.acceptedTerms) {
    throw new SignUpValidationError(`Need to accept terms to sign up`, SignUpValidationErrorCode.NOT_ACCEPTED_TERMS);
  }
  const userCredential = await firebaseLogInManager.signUpWithEmailAndPassword(request.email, request.password);
  const loggedInUser = await postLogInUserCredentialProcessor.postLogIn(userCredential, request);
  await userAssociator.associate(loggedInUser.user.id, request.anonymousUserId);
  await userAssociator.associateSession(loggedInUser.sessionId, request.anonymousSessionId);
  return {
    user: userDtoMapper.mapPublic(loggedInUser.user),
    accessToken: loggedInUser.accessToken,
    refreshToken: loggedInUser.refreshToken,
    sessionId: loggedInUser.sessionId,
    isNewUser: loggedInUser.isNewUser,
  }
}

export const userSignUpProcessor = {
  process,
}