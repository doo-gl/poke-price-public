import {ItemWatchDto} from "./ItemWatchDto";
import {itemWatchRetriever} from "./ItemWatchRetriever";
import {itemWatchDtoMapper} from "./ItemWatchDtoMapper";

export interface ItemWatchRequest {
  userId:string
}

const retrieve = async (request:ItemWatchRequest):Promise<Array<ItemWatchDto>> => {
  const itemWatches = await itemWatchRetriever.retrieveActiveByUserId(request.userId);
  return itemWatchDtoMapper.mapWatches(itemWatches)
}

export const itemWatchDtoRetriever = {
  retrieve,
}