import {itemWatchRetriever} from "./ItemWatchRetriever";
import {itemRetriever} from "../item/ItemRetriever";
import {legacyIdOrFallback} from "../item/ItemEntity";

export interface ItemWatchCountResponse {
  itemId:string,
  numberOfWatches:number,
}

const retrieve = async (itemId:string):Promise<ItemWatchCountResponse> => {
  const item = await itemRetriever.retrieveByIdOrLegacyId(itemId)
  const itemWatches = await itemWatchRetriever.retrieveActiveByItemId(item._id.toString())
  return {
    itemId,
    numberOfWatches: itemWatches.length,
  }
}


export const itemWatchCountRetriever = {
  retrieve,
}