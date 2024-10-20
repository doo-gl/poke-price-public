import {MongoEntity} from "../../database/mongo/MongoEntity";
import {mongoRepositoryFactory} from "../../database/mongo/MongoRepositoryFactory";

export enum SearchTagType {
  MARKETPLACE_LISTING = 'MARKETPLACE_LISTING',
  ITEM = 'ITEM',
}


export interface SearchTagEntity extends MongoEntity {
  type:SearchTagType,
  key:string|null,
  value:string,
  tag:string,
  keyLabel:string|null,
  valueLabel:string|null,
  public:boolean,
}

export interface SearchTag {
  key:string|null,
  value:string,
  keyLabel:string|null,
  valueLabel:string|null,
  public?:boolean
}

export const toTag = (searchTag:SearchTag):string => {
  return searchTag.key
    ? `${searchTag.key}|${searchTag.value}`
    : searchTag.value
}

export const fromTag = (tag:string):SearchTag => {
  const split = tag.split('|');
  if (split.length !== 2) {
    return {value: tag, key: null, keyLabel: null, valueLabel: null}
  }
  const key = split[0]
  const value = split[1]
  return {key, value, keyLabel: null, valueLabel: null}
}

export const keyValueToTag = (key:string|null, value:string) => {
  return key
    ? `${key}|${value}`
    : value
}

export const toSearchTag = (entity:SearchTagEntity):SearchTag => {
  return {
    key: entity.key,
    value: entity.value,
    keyLabel: entity.keyLabel,
    valueLabel: entity.valueLabel,
  }
}

const COLLECTION_NAME = 'search.tags'

const result = mongoRepositoryFactory.build<SearchTagEntity>(COLLECTION_NAME);
export const searchTagRepository = result.repository;
export const searchTagCreator = result.creator;
export const searchTagUpdater = result.updater;
export const searchTagDeleter = result.deleter;