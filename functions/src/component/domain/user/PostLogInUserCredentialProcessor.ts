import {UserDetails, UserEntity} from "./UserEntity";
import {userRetriever} from "./UserRetriever";
import {UnexpectedError} from "../../error/UnexpectedError";
import {Create, Update} from "../../database/Entity";
import {baseUserCreator, userUpdater} from "./UserRepository";
import {TokenDto} from "./UserDto";
import {CallerDetails} from "./UserEndpoints";
import {userSessionStarter} from "./UserSessionStarter";
import {mailchimpContactAdder} from "../mailchimp/MailchimpContactAdder";
import {TimestampStatic, User, UserCredential} from "../../external-lib/Firebase";
import {userReactivationChecker} from "./reactivate/UserReactivationChecker";
import {momentToTimestamp} from "../../tools/TimeConverter";

export interface LoggedInUser extends TokenDto {
  user:UserEntity,
  sessionId:string,
  isNewUser:boolean,
}

export interface FirebaseUserDetails {
  uid:string,
  email:string
  displayName:string,
  photoUrl:string|null,
}

const extractEmail = (firebaseUserDetails:User):string|null => {
  if (firebaseUserDetails.email) {
    return firebaseUserDetails.email;
  }
  if (
    firebaseUserDetails.providerData && firebaseUserDetails.providerData.length > 0
    && !!firebaseUserDetails.providerData[0] && firebaseUserDetails.providerData[0].email
  ) {
    return firebaseUserDetails.providerData[0].email;
  }
  return null;
}

const extractFallbackDisplayName = (email:string):string => {
  return email.replace(/@.*$/gi, '');
}

const getPreExistingUser = async (firebaseUserId:string, email:string):Promise<UserEntity|null> => {
  const userFromEmail = await userRetriever.retrieveByEmail(email);
  if (userFromEmail) {
    return userFromEmail;
  }
  const userFromId = await userRetriever.retrieveByFirebaseUserId(firebaseUserId);
  return userFromId;
}

const extractFirebaseUserDetails = (firebaseResponseUser:User):FirebaseUserDetails => {
  const firebaseUserId = firebaseResponseUser.uid;
  const email = extractEmail(firebaseResponseUser);
  if (!email) {
    throw new UnexpectedError(`User Credential: ${firebaseUserId} does not have email`);
  }
  const displayName = firebaseResponseUser.displayName || extractFallbackDisplayName(email);
  const photoUrl = firebaseResponseUser.photoURL;
  return {
    uid: firebaseUserId,
    email,
    photoUrl,
    displayName,
  }
}

const getOrCreateUser = async (firebaseUserDetails:FirebaseUserDetails):Promise<{user:UserEntity, isNewUser:boolean}> => {
  const firebaseUserId = firebaseUserDetails.uid;
  const email = firebaseUserDetails.email
  const preExistingUser = await getPreExistingUser(firebaseUserId, email);
  if (preExistingUser) {
    return { user:preExistingUser, isNewUser: false };
  }
  const displayName = firebaseUserDetails.displayName || extractFallbackDisplayName(email);
  const photoUrl = firebaseUserDetails.photoUrl;
  const createUser:Create<UserEntity> = {
    mostRecentSessionId: null,
    parentUserId: null,
    firebaseUserIds: [firebaseUserId],
    facebookUserId: null,
    details: {
      displayName,
      photoUrl,
      email,
    },
    stripeDetails: null,
    membership: null,
    terms: {
      acceptedMarketing: true,
      acceptedTerms: true,
    },
    nextReactivationAttempt: momentToTimestamp(userReactivationChecker.calculateNextReactivationAttempt()),
    percentileDetails: null,
  }
  const createdUser = await baseUserCreator.create(createUser);
  await mailchimpContactAdder.addContact(createdUser)
  return { user:createdUser, isNewUser: true };
}

const calculateDetailsUpdate = (firebaseUserDetails:FirebaseUserDetails, user:UserEntity):UserDetails|null => {
  const email:string = firebaseUserDetails.email;
  const displayName:string|null = firebaseUserDetails.displayName;
  const photoUrl:string|null = firebaseUserDetails.photoUrl;

  const update:any = user.details || {};

  update.email = email;
  update.displayName = displayName || update.displayName || extractFallbackDisplayName(email);
  update.photoUrl = photoUrl || update.photoUrl || null;
  return update;
}

const updateUser = async (firebaseUserDetails:FirebaseUserDetails, user:UserEntity):Promise<UserEntity> => {
  const firebaseUserId = firebaseUserDetails.uid;

  const update:Update<UserEntity> = {};
  const details = calculateDetailsUpdate(firebaseUserDetails, user);

  if (details) {
    update.details = details;
  }

  if (!user.firebaseUserIds || !user.firebaseUserIds.some(id => id === firebaseUserId)) {
    const newFirebaseUserIds = user.firebaseUserIds || [];
    newFirebaseUserIds.push(firebaseUserId);
    update.firebaseUserIds = newFirebaseUserIds;
  }

  if (Object.keys(update).length > 0) {
    return userUpdater.updateAndReturn(user.id, update);
  }
  return user;
}

const postLogIn = async (userCredential:UserCredential, caller:CallerDetails):Promise<LoggedInUser> => {
  const firebaseCredentialUser = userCredential.user;
  if (!firebaseCredentialUser) {
    throw new UnexpectedError(`User Credential does not have user details`);
  }
  const firebaseUserDetails = extractFirebaseUserDetails(firebaseCredentialUser)
  const userResult = await getOrCreateUser(firebaseUserDetails);
  const user = userResult.user;
  const results = await Promise.all([
    updateUser(firebaseUserDetails, user),
    firebaseCredentialUser.getIdToken(),
    userSessionStarter.start({userId: user.id, ...caller}),
  ])
  const updatedUser = results[0];
  const accessToken = results[1];
  const session = results[2];
  const refreshToken = firebaseCredentialUser.refreshToken;
  return {
    accessToken,
    refreshToken,
    user: updatedUser,
    sessionId: session.sessionId,
    isNewUser: userResult.isNewUser,
  }
}



const processFirebaseUserDetails = async (firebaseUserDetails:FirebaseUserDetails, caller:CallerDetails):Promise<Omit<LoggedInUser, "refreshToken"|"accessToken">> => {

  const userResult = await getOrCreateUser(firebaseUserDetails);
  const user = userResult.user;
  await updateUser(firebaseUserDetails, user)
  const session = await userSessionStarter.start({userId: user.id, ...caller})

  return {
    user,
    sessionId: session.sessionId,
    isNewUser: userResult.isNewUser,
  }
}

export const postLogInUserCredentialProcessor = {
  postLogIn,
  processFirebaseUserDetails,
}