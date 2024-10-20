import {baseUserCreator} from "./UserRepository";
import {userSessionStarter} from "./UserSessionStarter";
import {PublicUserSessionDto} from "./PublicUserSessionDto";
import {CallerDetails} from "./UserEndpoints";

const anonymous = async (details:CallerDetails):Promise<PublicUserSessionDto> => {
  const user = await baseUserCreator.create({
    mostRecentSessionId: null,
    parentUserId: null,
    firebaseUserIds: null,
    facebookUserId: null,
    details: null,
    stripeDetails: null,
    membership: null,
    terms: null,
  });
  return userSessionStarter.start({
    userId: user.id,
    ...details,
  });
}

export const userCreator = {
  anonymous,
}