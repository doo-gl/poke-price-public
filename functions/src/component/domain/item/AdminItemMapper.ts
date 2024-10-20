import {ItemEntity} from "./ItemEntity";
import {MongoEntity} from "../../database/mongo/MongoEntity";
import {EntityDto} from "../EntityDto";
import moment from "moment";


export interface AdminItemDto extends Omit<ItemEntity, keyof MongoEntity>, EntityDto {

}

const map = (item:ItemEntity):AdminItemDto => {
  return {
    ...item,
    id: item._id.toString(),
    dateCreated: moment(item.dateCreated),
    dateLastModified: moment(item.dateLastModified),
  }
}

export const adminItemMapper = {
  map,
}
