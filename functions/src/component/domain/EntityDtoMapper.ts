import {Entity} from "../database/Entity";
import {EntityDto} from "./EntityDto";
import {timestampToMoment} from "../tools/TimeConverter";


const map = (entity:Entity):EntityDto => {
  return {
    id: entity.id,
    dateCreated: timestampToMoment(entity.dateCreated),
    dateLastModified: timestampToMoment(entity.dateLastModified),
  }
}

export const entityDtoMapper = {
  map,
}