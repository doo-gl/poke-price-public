import {EntityDto} from "../EntityDto";
import {Entity} from "../../database/Entity";
import {CardCollectionEntity} from "./CardCollectionEntity";
import {timestampToMoment} from "../../tools/TimeConverter";


export interface AdminCollectionDto extends EntityDto, Omit<CardCollectionEntity, keyof Entity> {

}


const map = (entity:CardCollectionEntity):AdminCollectionDto => {
  const {
    id,
    dateCreated,
    dateLastModified,
    ...dto
  } = entity
  return {
    ...dto,
    id: entity.id,
    dateCreated: timestampToMoment(dateCreated),
    dateLastModified: timestampToMoment(dateLastModified),
  }
}

export const adminCollectionMapper = {
  map,
}