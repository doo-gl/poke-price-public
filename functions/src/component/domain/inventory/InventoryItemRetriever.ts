import {InventoryItemEntity, inventoryItemRepository} from "./InventoryItemEntity";
import {byIdRetriever} from "../../database/ByIdRetriever";
import {batchIds} from "../../database/BaseCrudRepository";
import {flattenArray} from "../../tools/ArrayFlattener";
import {dedupe} from "../../tools/ArrayDeduper";


const retrieve = (id:string):Promise<InventoryItemEntity> => {
  return byIdRetriever.retrieve(
    inventoryItemRepository,
    id,
    inventoryItemRepository.collectionName
  )
}
const retrieveByIds = (ids:Array<string>):Promise<Array<InventoryItemEntity>> => {
  return inventoryItemRepository.getManyById(ids)
}

const retrieveByItemIdAndUserId = (itemId:string, userId:string):Promise<Array<InventoryItemEntity>> => {
  return inventoryItemRepository.getMany([
    { field: "itemId", operation: "==", value: itemId },
    { field: "userId", operation: "==", value: userId },
  ])
}

const retrieveByUserId = (userId:string, limit?:number):Promise<Array<InventoryItemEntity>> => {
  return inventoryItemRepository.getMany(
    [
      { field: "userId", operation: "==", value: userId },
    ],
    {
      limit,
    }
  )
}

const retrieveByItemIdsAndUserId = async (itemIds:Array<string>, userId:string):Promise<Array<InventoryItemEntity>> => {
  const idBatches = batchIds(itemIds)
  const resultBatches = await Promise.all(idBatches.map(idBatch =>
    inventoryItemRepository.getMany([
      { field: "itemId", operation: "in", value: idBatch },
      { field: "userId", operation: "==", value: userId },
    ])
  ))
  const results = dedupe(flattenArray(resultBatches), i => i.id)
  return results
}

const retrieveManyForUser = async (ids:Array<string>, userId:string):Promise<Array<InventoryItemEntity>> => {
  const idBatches = batchIds(ids)
  const resultBatches = await Promise.all(idBatches.map(idBatch =>
    inventoryItemRepository.getMany([
      { field: "id", operation: "in", value: idBatch },
      { field: "userId", operation: "==", value: userId },
    ])
  ))
  const results = dedupe(flattenArray(resultBatches), i => i.id)
  return results
}

export const inventoryItemRetriever = {
  retrieve,
  retrieveByIds,
  retrieveByItemIdAndUserId,
  retrieveByItemIdsAndUserId,
  retrieveByUserId,
  retrieveManyForUser,
}