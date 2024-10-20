import {EmailType, UserEntity} from "./UserEntity";
import {CurrentUserDto} from "./UserDto";
import {dedupe} from "../../tools/ArrayDeduper";
import {userUpdater} from "./UserRepository";
import {userDtoMapper} from "./UserDtoMapper";
import {toInputValueSet} from "../../tools/SetBuilder";

const subscribe = async (user:UserEntity, emailTypes:Array<EmailType>):Promise<CurrentUserDto> => {
  const typesToRemove = toInputValueSet(emailTypes)
  const currentUnsubscribeTypes = user.emailPreferences?.unsubscribedEmailTypes ?? []
  const newUnsubscribeTypes = dedupe(
    currentUnsubscribeTypes.slice().filter(type => !typesToRemove.has(type)),
      i => i
  )
  const updatedUser = await userUpdater.update(user.id, { emailPreferences: { unsubscribedEmailTypes: newUnsubscribeTypes } })
  return userDtoMapper.mapCurrent(updatedUser);
}

const unsubscribe = async (user:UserEntity, emailTypes:Array<EmailType>):Promise<CurrentUserDto> => {
  const currentUnsubscribeTypes = user.emailPreferences?.unsubscribedEmailTypes ?? []
  const newUnsubscribeTypes = dedupe(currentUnsubscribeTypes.slice().concat(emailTypes), i => i)
  const updatedUser = await userUpdater.update(user.id, { emailPreferences: { unsubscribedEmailTypes: newUnsubscribeTypes } })
  return userDtoMapper.mapCurrent(updatedUser);
}

export const userEmailSubscriber = {
  subscribe,
  unsubscribe,
}