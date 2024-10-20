import {UserDetails, UserEntity} from "./UserEntity";
import {CurrentUserDto, PublicUserDto} from "./UserDto";
import {userContext} from "../../infrastructure/UserContext";
import {userUpdater} from "./UserRepository";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {userDtoMapper} from "./UserDtoMapper";

export interface UpdateUsernameRequest {
  username:string,
}

const update = async (user:UserEntity, request:UpdateUsernameRequest):Promise<CurrentUserDto> => {
  const userDetails = user.details
  if (!userDetails) {
    throw new InvalidArgumentError(`User ${user.id} does not have details`)
  }
  const newDetails:UserDetails = {
    ...userDetails,
    username: request.username,
  }
  const updatedUser = await userUpdater.updateAndReturn(user.id, {details: newDetails})
  return userDtoMapper.mapCurrent(updatedUser)
}

const updateFromContext = (request:UpdateUsernameRequest):Promise<CurrentUserDto> => {
  const user = userContext.getUserOrThrow()
  return update(user, request)
}

export const usernameUpdater = {
  update,
  updateFromContext,
}