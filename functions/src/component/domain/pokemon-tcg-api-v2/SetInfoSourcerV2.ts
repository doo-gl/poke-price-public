import {SetEntity} from "../set/SetEntity";
import {ItemEntity} from "../item/ItemEntity";

export interface SetSourceResultV2 {
  set:SetEntity,
  cards:Array<ItemEntity>,
}


const source = async (pokemonTcgApiSetId:string):Promise<any> => {
// const source = async (pokemonTcgApiSetId:string):Promise<SetSourceResultV2> => {
  // gather all the creates / updates for set / items
  // if doing a dry run, log all the creates / updates
  // else apply all the creates / updates - making sure to apply the set id after creation
  // apply all the extras
  // decide if there are reverse holos by checking other data sources
}

export const setInfoSourcerV2 = {
  source,
}