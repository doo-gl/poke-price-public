import {InvalidArgumentError} from "../../error/InvalidArgumentError";

export interface UniqueSet {
  series:string,
  set:string,
}

export interface SetId {
  setId:string,
}

export type SetMappingKey = string;

const createMappingKey = (setIdentifier:UniqueSet):SetMappingKey => {
  return `${setIdentifier.series}|${setIdentifier.set}`;
}

const parseMappingKey = (key:SetMappingKey):UniqueSet => {
  const split = key.split('|');
  if (split.length !== 2) {
    throw new InvalidArgumentError(`Expected to find 3 tokens in mapping: ${key}`);
  }
  return {
    series: split[0],
    set: split[1],
  }
}

export const uniqueSetIdentifier = {
  createMappingKey,
  parseMappingKey,
}