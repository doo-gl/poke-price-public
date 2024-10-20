import {inventoryItemRetriever} from "./InventoryItemRetriever";
import {cardOwnershipRetriever} from "../card-ownership/CardOwnershipRetriever";
import {cardCollectionOwnershipRetriever} from "../card-collection/CardCollectionOwnershipRetriever";
import {toInputValueMap, toInputValueMultiMap} from "../../tools/MapBuilder";
import {CardCollectionOwnershipEntity} from "../card-collection/CardCollectionOwnershipEntity";
import {BatchUpdate} from "../../database/BaseCrudRepository";
import {CardOwnershipEntity, OwnershipType} from "../card-ownership/CardOwnershipEntity";
import {cardOwnershipRepository} from "../card-ownership/CardOwnershipRepository";
import {Create} from "../../database/Entity";
import {cardOwnershipMarker} from "../card-ownership/CardOwnershipMarker";
import {logger} from "firebase-functions";


const reconcile = async (userId:string) => {
  const inventoryItems = await inventoryItemRetriever.retrieveByUserId(userId)
  const ownerships = await cardOwnershipRetriever.retrieveByUserId(userId)
  const collectionOwnerships = await cardCollectionOwnershipRetriever.retrieveByUserId(userId)

  const itemIdToInventoryItems = toInputValueMultiMap(inventoryItems, i => i.itemId)
  const itemIdToOwnershipToDelete = toInputValueMap(ownerships, i => i.cardId)
  const itemIdToCollectionOwnershipToRemove = new Map<string, CardCollectionOwnershipEntity>()
  collectionOwnerships.forEach(collectionOwnership => {
    collectionOwnership.ownedCardIds.forEach(ownedItemId => {
      itemIdToCollectionOwnershipToRemove.set(ownedItemId, collectionOwnership)
    })
  })

  const ownershipsToCreate:Array<Create<CardOwnershipEntity>> = []
  const itemIdsToAddToCollectionOwnerships:Array<string> = []
  const ownershipsToUpdate:Array<BatchUpdate<CardOwnershipEntity>> = [];
  [...itemIdToInventoryItems.entries()].forEach(entry => {
    const ownedItemId = entry[0]
    const inventoryItemsForItemId = entry[1]

    const ownership = itemIdToOwnershipToDelete.get(ownedItemId)
    if (ownership) {
      itemIdToOwnershipToDelete.delete(ownedItemId) // ownership exists, so can be removed from the list of ownerships to delete

      if (ownership.inventoryItemIds.sort().join(',') !== inventoryItemsForItemId.map(i => i.id).sort().join(',')) { // ownership exists but needs inventory items updating
        ownershipsToUpdate.push({
          id: ownership.id,
          update: {
            inventoryItemIds: inventoryItemsForItemId.map(i => i.id).sort(),
          },
        })
      }

    } else {
      ownershipsToCreate.push({
        cardId: ownedItemId,
        inventoryItemIds: inventoryItemsForItemId.map(i => i.id).sort(),
        userId,
        ownershipType: OwnershipType.OWNED,
      }) // ownership does not exist, so needs to be created
    }

    const collectionOwnership = itemIdToCollectionOwnershipToRemove.get(ownedItemId)
    if (collectionOwnership) {
      itemIdToCollectionOwnershipToRemove.delete(ownedItemId) // collection ownership exists, so can be removed from the list of ownerships to delete
    } else {
      itemIdsToAddToCollectionOwnerships.push(ownedItemId) // collection ownership does not exist, so needs to be created
    }
  })

  const itemIdsToRemoveFromCollectionOwnerships = [...itemIdToCollectionOwnershipToRemove.keys()]
  const ownershipIdsToDelete = [...itemIdToOwnershipToDelete.values()].map(ownership => ownership.id)



  if (ownershipsToCreate.length > 0) {
    logger.info(`Creating ${ownershipsToCreate.length} missing ownerships for user: ${userId}`)
    await cardOwnershipRepository.batchCreate(ownershipsToCreate)
  }
  if (ownershipsToUpdate.length > 0) {
    logger.info(`Updating ${ownershipsToUpdate.length} ownerships for user: ${userId}`)
    await cardOwnershipRepository.batchUpdate(ownershipsToUpdate)
  }
  if (ownershipIdsToDelete.length > 0) {
    logger.info(`Deleting ${ownershipIdsToDelete.length} ownerships for user: ${userId}`)
    await cardOwnershipRepository.batchDelete(ownershipIdsToDelete)
  }
  if (itemIdsToAddToCollectionOwnerships.length > 0) {
    logger.info(`Marking ${itemIdsToAddToCollectionOwnerships.length} ownerships in collections for user: ${userId}`)
    await cardOwnershipMarker.markCollectionsAsOwned(userId, itemIdsToAddToCollectionOwnerships)
  }
  if (itemIdsToRemoveFromCollectionOwnerships.length > 0) {
    logger.info(`Marking ${itemIdsToRemoveFromCollectionOwnerships.length} non ownerships for user: ${userId}`)
    await cardOwnershipMarker.markCollectionsAsNotOwned(userId, itemIdsToRemoveFromCollectionOwnerships)
  }

}

export const inventoryOwnershipReconciler = {
  reconcile,
}