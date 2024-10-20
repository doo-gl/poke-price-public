import {ItemWatchEntity, itemWatchRepository, ItemWatchState} from "./ItemWatchEntity";
import {byIdRetriever} from "../../database/ByIdRetriever";
import {singleResultRepoQuerier} from "../../database/SingleResultRepoQuerier";


const retrieve = (itemWatchId:string):Promise<ItemWatchEntity> => {
  return byIdRetriever.retrieve(
    itemWatchRepository,
    itemWatchId,
    itemWatchRepository.collectionName
  )
}

const itemHasActiveWatches = async (itemId:string):Promise<boolean> => {
  const watches = await itemWatchRepository.getMany(
    [
      { field: "itemId", operation: "==", value: itemId },
      { field: "state", operation: "==", value: ItemWatchState.ACTIVE },
    ],
    {
      limit: 1,
    }
  )
  return watches.length > 0
}

const userHasActiveWatches = async (userId:string):Promise<boolean> => {
  const watches = await itemWatchRepository.getMany(
    [
      { field: "userId", operation: "==", value: userId },
      { field: "state", operation: "==", value: ItemWatchState.ACTIVE },
    ],
    {
      limit: 1,
    }
  )
  return watches.length > 0
}

const retrieveActiveByUserId = (userId:string):Promise<Array<ItemWatchEntity>> => {
  return itemWatchRepository.getMany([
    { field: "userId", operation: "==", value: userId },
    { field: "state", operation: "==", value: ItemWatchState.ACTIVE },
  ])
}

const retrieveByUserId = (userId:string):Promise<Array<ItemWatchEntity>> => {
  return itemWatchRepository.getMany([
    { field: "userId", operation: "==", value: userId },
  ])
}

const retrieveActiveByItemId = (itemId:string):Promise<Array<ItemWatchEntity>> => {
  return itemWatchRepository.getMany([
    { field: "itemId", operation: "==", value: itemId },
    { field: "state", operation: "==", value: ItemWatchState.ACTIVE },
  ])
}

const isItemBeingWatched = async (itemId:string):Promise<boolean> => {
  const watches = await itemWatchRepository.getMany(
    [
      { field: "itemId", operation: "==", value: itemId },
      { field: "state", operation: "==", value: ItemWatchState.ACTIVE },
    ],
    { limit: 1 }
  )
  return watches.length > 0;
}

const retrieveByUserIdAndItemId = (userId:string, itemId:string):Promise<ItemWatchEntity|null> => {
  return singleResultRepoQuerier.query(
    itemWatchRepository,
    [
      { name: "userId", value: userId },
      { name: "itemId", value: itemId },
    ],
    itemWatchRepository.collectionName
  )
}

export const itemWatchRetriever = {
  retrieve,
  itemHasActiveWatches,
  userHasActiveWatches,
  retrieveActiveByUserId,
  retrieveByUserId,
  retrieveActiveByItemId,
  retrieveByUserIdAndItemId,
  isItemBeingWatched,
}