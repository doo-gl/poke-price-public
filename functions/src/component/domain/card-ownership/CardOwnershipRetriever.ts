import {CardOwnershipEntity, OwnershipType} from "./CardOwnershipEntity";
import {cardOwnershipRepository} from "./CardOwnershipRepository";
import {byIdRetriever} from "../../database/ByIdRetriever";
import {flattenArray} from "../../tools/ArrayFlattener";
import {batchIds} from "../../database/BaseCrudRepository";


const retrieve = (id:string):Promise<CardOwnershipEntity> => {
  return byIdRetriever.retrieve(
    cardOwnershipRepository,
    id,
    cardOwnershipRepository.collectionName,
  )
}

const retrieveByIds = (ids:Array<string>):Promise<Array<CardOwnershipEntity>> => {
  return cardOwnershipRepository.getManyById(ids)
}

const retrieveCardsOwnedByUser = async (cardIds:Array<string>, userId:string):Promise<Array<CardOwnershipEntity>> => {
  const idBatches:Array<Array<string>> = batchIds(cardIds)
  const resultBatches:Array<Array<CardOwnershipEntity>> = await Promise.all(
    idBatches.map((idBatch) => cardOwnershipRepository.getMany([
      { field: "cardId", operation: "in", value: idBatch },
      { field: "userId", operation: "==", value: userId },
      { field: "ownershipType", operation: "==", value: OwnershipType.OWNED },
    ]))
  );
  const results = flattenArray(resultBatches);
  return results;
}

const hasOwnerships = async (userId:string):Promise<boolean> => {
  const ownerships = await cardOwnershipRepository.getMany(
    [{ field: 'userId', operation: '==', value: userId }],
    { limit: 1 }
  )
  return ownerships.length > 0
}

const retrieveByInventoryItemId = async (inventoryItemId:string):Promise<Array<CardOwnershipEntity>> => {
  return cardOwnershipRepository.getMany([
    { field: 'inventoryItemIds', operation: "array-contains", value: inventoryItemId },
  ])
}

const retrieveByUserId = async (userId:string):Promise<Array<CardOwnershipEntity>> => {
  return cardOwnershipRepository.getMany([
    { field: 'userId', operation: "==", value: userId },
  ])
}

export const cardOwnershipRetriever = {
  retrieve,
  retrieveByIds,
  retrieveCardsOwnedByUser,
  retrieveByInventoryItemId,
  hasOwnerships,
  retrieveByUserId,
}