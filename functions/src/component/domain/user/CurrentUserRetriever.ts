import {CurrentUserDto} from "./UserDto";
import {userContext} from "../../infrastructure/UserContext";
import {NotAuthorizedError} from "../../error/NotAuthorizedError";
import {userDtoMapper} from "./UserDtoMapper";


const retrieve = async ():Promise<CurrentUserDto> => {
  const user = userContext.getUser();
  if (!user) {
    throw new NotAuthorizedError(`No current user found`);
  }
  return userDtoMapper.mapCurrent(user);
}

export const currentUserRetriever = {
  retrieve,
}