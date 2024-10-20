import {EntityDto} from "../EntityDto";
import {UserEntity} from "./UserEntity";
import {Entity} from "../../database/Entity";
import {timestampToMoment} from "../../tools/TimeConverter";

export interface AdminUserDto extends EntityDto, Omit<UserEntity, keyof Entity> {

}

const map = (user:UserEntity):AdminUserDto => {
  const {
    id,
    dateCreated,
    dateLastModified,
    ...dto
  } = user
  return {
    ...dto,
    id: user.id,
    dateCreated: timestampToMoment(dateCreated),
    dateLastModified: timestampToMoment(dateLastModified),
  }
}

export const adminUserMapper = {
  map,
}