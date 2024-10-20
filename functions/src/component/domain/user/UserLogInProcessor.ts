import {SignInValidationError, SignInValidationErrorCode} from "../../error/SignInValidationError";
import {UnexpectedError} from "../../error/UnexpectedError";
import {PublicUserDto, TokenDto} from "./UserDto";
import {userRetriever} from "./UserRetriever";
import {userDtoMapper} from "./UserDtoMapper";
import {userAssociator} from "./UserAssociator";
import {firebaseLogInManager} from "./FirebaseLogInManager";
import {postLogInUserCredentialProcessor} from "./PostLogInUserCredentialProcessor";
import {CallerDetails, LogInBody} from "../webapp/UserWebappEndpoints";



export interface LogInRequest extends LogInBody, CallerDetails {}

export interface LogInResponse extends TokenDto {
  user:PublicUserDto,
  sessionId:string,
  isNewUser:boolean
}

const process = async (request:LogInRequest):Promise<LogInResponse> => {
  const userCredential = await firebaseLogInManager.logInWithEmailAndPassword(request.email, request.password);
  if (!userCredential.user) {
    throw new UnexpectedError(`User does not have details`);
  }
  const firebaseUserId = userCredential.user.uid;
  const user = await userRetriever.retrieveByFirebaseUserId(firebaseUserId);
  if (!user) {
    throw new SignInValidationError(`Details do not match a known user`, SignInValidationErrorCode.USER_NOT_FOUND);
  }
  const loggedInUser = await postLogInUserCredentialProcessor.postLogIn(userCredential, request);
  await userAssociator.associate(loggedInUser.user.id, request.anonymousUserId);
  await userAssociator.associateSession(loggedInUser.sessionId, request.anonymousSessionId);
  return {
    refreshToken: loggedInUser.refreshToken,
    accessToken: loggedInUser.accessToken,
    sessionId: loggedInUser.sessionId,
    user: userDtoMapper.mapPublic(loggedInUser.user),
    isNewUser: loggedInUser.isNewUser,
  }
}

export const userLogInProcessor = {
  process,
}