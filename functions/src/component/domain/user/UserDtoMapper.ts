import {UserEntity} from "./UserEntity";
import {PublicAnonymousUserDto} from "./PublicAnonymousUserDto";
import {CurrentUserDto, PublicUserDto} from "./UserDto";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {PercentileDetails} from "../card-ownership/stats/PercentileDetailCalculator";


const mapAnonymous = (user:UserEntity):PublicAnonymousUserDto => {
  return {
    userId: user.id,
  }
}

const mapPublic = (user:UserEntity):PublicUserDto => {
  if (!user.details) {
    throw new InvalidArgumentError(`Cannot map user with id: ${user.id} to a public user, no details`)
  }
  return {
    userId: user.id,
    displayName: user.details.displayName,
    username: user.details.username ?? null,
    photoUrl: user.details.photoUrl,
  }
}

const mapCurrent = (user:UserEntity):CurrentUserDto => {
  if (!user.details) {
    throw new InvalidArgumentError(`Cannot map user with id: ${user.id} to a current user, no details`)
  }
  return {
    userId: user.id,
    email: user.details.email,
    displayName: user.details.displayName,
    username: user.details.username ?? null,
    photoUrl: user.details.photoUrl,
    plans: user.membership?.plans ?? [],
    unsubscribedEmailTypes: user?.emailPreferences?.unsubscribedEmailTypes ?? [],
    preferredCurrencyCode: user?.preferredCurrency ?? null,
  }
}

export const userDtoMapper = {
  mapAnonymous,
  mapPublic,
  mapCurrent,
}