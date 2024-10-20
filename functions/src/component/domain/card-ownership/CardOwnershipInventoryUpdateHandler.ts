import {cardOwnershipRetriever} from "./CardOwnershipRetriever";
import {cardOwnershipMarker} from "./CardOwnershipMarker";
import {CardOwnershipEntity} from "./CardOwnershipEntity";
import {BatchUpdate} from "../../database/BaseCrudRepository";
import {cardOwnershipRepository} from "./CardOwnershipRepository";

const getOrCreateOwnerships = async (userId:string, cardId:string):Promise<Array<CardOwnershipEntity>> => {
  const ownerships = await cardOwnershipRetriever.retrieveCardsOwnedByUser([cardId], userId)
  if (ownerships.length > 0) {
    return ownerships
  }
  return await cardOwnershipMarker.markAsOwnedForUserId(userId, [cardId])
}

const onItemCreated = async (userId:string, cardId:string, inventoryItemId:string):Promise<void> => {
  const ownerships = await getOrCreateOwnerships(userId, cardId)
  const updates:Array<BatchUpdate<CardOwnershipEntity>> = []
  ownerships.forEach(ownership => {
    const newInventoryItemIds = (ownership.inventoryItemIds ?? []).concat([inventoryItemId])
    newInventoryItemIds.sort()
    updates.push({
      id: ownership.id,
      update: {
        inventoryItemIds: newInventoryItemIds,
      },
    })
  })
  await cardOwnershipRepository.batchUpdate(updates)
}

const onItemDeleted = async (inventoryItemId:string):Promise<void> => {
  const ownerships = await cardOwnershipRetriever.retrieveByInventoryItemId(inventoryItemId)
  const updates:Array<BatchUpdate<CardOwnershipEntity>> = []
  ownerships.forEach(ownership => {
    const newInventoryItemIds = (ownership.inventoryItemIds ?? []).filter(id => id !== inventoryItemId)
    newInventoryItemIds.sort()
    updates.push({
      id: ownership.id,
      update: {
        inventoryItemIds: newInventoryItemIds,
      },
    })
  })
  await cardOwnershipRepository.batchUpdate(updates)
}

export const cardOwnershipInventoryUpdateHandler = {
  onItemCreated,
  onItemDeleted,
}