import {UserEventEntity} from "./UserEventEntity";
import {EntityDto} from "../../EntityDto";
import moment from "moment";

export interface AdminUserEventDto extends EntityDto, Omit<UserEventEntity, keyof EntityDto|"_id"> {
  _id:string
}

const map = (event:UserEventEntity):AdminUserEventDto => {
  const {
    _id,
    dateCreated,
    dateLastModified,
    ...dto
  } = event
  return {
    ...dto,
    id: event._id.toString(),
    _id: event._id.toString(),
    dateCreated: moment(dateCreated),
    dateLastModified: moment(dateLastModified),
  }
}

export const adminUserEventMapper = {
  map,
}