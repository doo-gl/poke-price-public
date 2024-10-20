import {ItemModification} from "./ItemModification";

export interface ItemModificationIdentificationResult {
  itemModification:ItemModification|null,
  shouldFilter:boolean
}