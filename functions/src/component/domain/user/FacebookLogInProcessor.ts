import {firebaseLogInManager} from "./FirebaseLogInManager";
import {postLogInUserCredentialProcessor} from "./PostLogInUserCredentialProcessor";
import {UserEntity} from "./UserEntity";
import {userUpdater} from "./UserRepository";
import {userDtoMapper} from "./UserDtoMapper";
import {LogInResponse} from "./UserLogInProcessor";
import {userAssociator} from "./UserAssociator";
import {CallerDetails, FacebookLogInBody} from "../webapp/UserWebappEndpoints";

export interface FacebookLogInRequest extends FacebookLogInBody, CallerDetails {}

const updateUser = async (facebookUserId: string, user: UserEntity): Promise<UserEntity> => {
  if (user.facebookUserId === facebookUserId) {
    return user;
  }
  return userUpdater.updateAndReturn(user.id, {facebookUserId});
}

const logIn = async (request:FacebookLogInRequest): Promise<LogInResponse> => {
  const userCredential = await firebaseLogInManager.logInWithFacebook(request.facebookAccessToken);
  const loggedInUser = await postLogInUserCredentialProcessor.postLogIn(userCredential, request);
  const updatedUser = await updateUser(request.facebookUserId, loggedInUser.user);
  await userAssociator.associate(updatedUser.id, request.anonymousUserId)
  await userAssociator.associateSession(loggedInUser.sessionId, request.anonymousSessionId)
  return {
    accessToken: loggedInUser.accessToken,
    refreshToken: loggedInUser.refreshToken,
    sessionId: loggedInUser.sessionId,
    user: userDtoMapper.mapPublic(updatedUser),
    isNewUser: loggedInUser.isNewUser,
  }
}

export const facebookLogInProcessor = {
  logIn,
}