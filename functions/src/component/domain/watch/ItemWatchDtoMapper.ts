import {ItemWatchEntity} from "./ItemWatchEntity";
import {ItemWatchDto} from "./ItemWatchDto";


const mapWatch = (itemWatch:ItemWatchEntity):ItemWatchDto => {
  return {
    itemId: itemWatch.itemId,
    itemWatchId: itemWatch.id,
    state: itemWatch.state,
    userId: itemWatch.userId,
  }
}

const mapWatches = (itemWatches:Array<ItemWatchEntity>):Array<ItemWatchDto> => {
  return itemWatches.map(mapWatch)
}

export const itemWatchDtoMapper = {
  mapWatch,
  mapWatches,
}