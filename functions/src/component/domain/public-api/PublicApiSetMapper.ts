import {SetEntity} from "../set/SetEntity";
import {capitaliseKey} from "../../tools/KeyConverter";


export interface PublicApiSetDto {
  setId:string,
  set:string,
  series:string
  name:string,
}

const map = (set:SetEntity):PublicApiSetDto => {
  return {
    setId: set.id,
    set: set.name,
    series: set.series,
    name: capitaliseKey(set.name),
  }
}

export const publicApiSetMapper = {
  map,
}