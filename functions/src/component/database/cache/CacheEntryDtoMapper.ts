import {CacheEntryEntity} from "./CacheEntryEntity";
import {CacheEntryDto} from "./CacheEntryDto";
import {entityDtoMapper} from "../../domain/EntityDtoMapper";
import {timestampToMoment} from "../../tools/TimeConverter";


const map = (entity:CacheEntryEntity):CacheEntryDto => {
  return {
    ...entityDtoMapper.map(entity),
    dateEntryExpires: timestampToMoment(entity.dateEntryExpires),
    entryType: entity.entryType,
    key: entity.key,
    value: entity.value,
  }
}

export const cacheEntryDtoMapper = {
  map,
}