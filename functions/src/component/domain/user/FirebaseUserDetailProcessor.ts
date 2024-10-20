import {CallerDetails, FirebaseUserDetailsRequest} from "../webapp/UserWebappEndpoints";
import {PublicUserDto} from "./UserDto";
import {userAssociator} from "./UserAssociator";
import {postLogInUserCredentialProcessor} from "./PostLogInUserCredentialProcessor";
import {UserEntity} from "./UserEntity";
import {userUpdater} from "./UserRepository";
import {userDtoMapper} from "./UserDtoMapper";

export interface FirebaseUserDetailResponse {
  user:PublicUserDto,
  sessionId:string,
  isNewUser:boolean
}

const updateUser = async (facebookUserId: string, user: UserEntity): Promise<UserEntity> => {
  if (user.facebookUserId === facebookUserId) {
    return user;
  }
  return userUpdater.updateAndReturn(user.id, {facebookUserId});
}

const process = async (firebaseUserDetails:FirebaseUserDetailsRequest, caller:CallerDetails):Promise<FirebaseUserDetailResponse> => {

  const loggedInUser = await postLogInUserCredentialProcessor.processFirebaseUserDetails(firebaseUserDetails, caller)
  let updatedUser = loggedInUser.user
  if (firebaseUserDetails.facebookUserId) {
    updatedUser = await updateUser(firebaseUserDetails.facebookUserId, loggedInUser.user);
  }
  await userAssociator.associate(loggedInUser.user.id, firebaseUserDetails.anonymousUserId)
  await userAssociator.associateSession(loggedInUser.sessionId, firebaseUserDetails.anonymousSessionId)
  return {
    user: userDtoMapper.mapPublic(updatedUser),
    sessionId: loggedInUser.sessionId,
    isNewUser: loggedInUser.isNewUser,
  }
}

export const firebaseUserDetailProcessor = {
  process,
}