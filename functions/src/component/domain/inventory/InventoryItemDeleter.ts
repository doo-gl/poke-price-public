import {UserEntity} from "../user/UserEntity";
import {inventoryItemRetriever} from "./InventoryItemRetriever";
import {NotAuthorizedError} from "../../error/NotAuthorizedError";
import {InventoryItemEntity, inventoryItemRepository} from "./InventoryItemEntity";
import {toSet} from "../../tools/SetBuilder";
import {configRetriever} from "../../infrastructure/ConfigRetriever";
import {cardOwnershipRetriever} from "../card-ownership/CardOwnershipRetriever";
import {cardOwnershipRepository} from "../card-ownership/CardOwnershipRepository";
import {cardOwnershipMarker} from "../card-ownership/CardOwnershipMarker";
import {BatchUpdate} from "../../database/BaseCrudRepository";
import {CardOwnershipEntity} from "../card-ownership/CardOwnershipEntity";
import {portfolioStatsRecalculator} from "../portfolio/PortfolioStatsRecalculator";



const deleteFromItemIds = async (user:UserEntity, itemIds:Array<string>):Promise<Array<InventoryItemEntity>> => {
  const inventoryItems = await inventoryItemRetriever.retrieveByItemIdsAndUserId(itemIds, user.id)
  await inventoryItemRepository.batchDelete(inventoryItems.map(inventoryItem => inventoryItem.id))
  return inventoryItems
}

const deleteManyItems = async (user:UserEntity, inventoryItemIds:Array<string>):Promise<void> => {
  const inventoryItems = await inventoryItemRetriever.retrieveManyForUser(inventoryItemIds, user.id)
  const itemIds = [...toSet(inventoryItems, i => i.itemId)]
  const ownerships = await cardOwnershipRetriever.retrieveCardsOwnedByUser(itemIds, user.id)

  const inventoryItemIdsToDelete = toSet(inventoryItems, i => i.id)
  const ownershipsToDelete:Array<CardOwnershipEntity> = []
  const ownershipsToUpdate:Array<BatchUpdate<CardOwnershipEntity>> = []
  const itemIdsBecomingNotOwned:Array<string> = []
  ownerships.forEach(ownership => {
    const inventoryOnOwnershipAfterDelete = ownership.inventoryItemIds
      .filter(inventoryItemId => !inventoryItemIdsToDelete.has(inventoryItemId))
    if (inventoryOnOwnershipAfterDelete.length === 0){
      ownershipsToDelete.push(ownership)
      itemIdsBecomingNotOwned.push(ownership.cardId)
    } else {
      ownershipsToUpdate.push({
        id: ownership.id,
        update: {
          inventoryItemIds: inventoryOnOwnershipAfterDelete,
        },
      })
    }
  })

  await cardOwnershipMarker.markCollectionsAsNotOwned(user.id, itemIdsBecomingNotOwned)

  await Promise.all([
    inventoryItemRepository.batchDelete([...inventoryItemIdsToDelete]),
    cardOwnershipRepository.batchDelete(ownershipsToDelete.map(ownership => ownership.id)),
    cardOwnershipRepository.batchUpdate(ownershipsToUpdate),
  ])
  // await portfolioStatsRecalculator.onOwnershipsRemoved(ownershipsToDelete)
  // await portfolioStatsRecalculator.onInventoryItemsRemoved(inventoryItems)
  await portfolioStatsRecalculator.onInventoryItemsRemovedV2(inventoryItems, ownershipsToDelete)
}

export const inventoryItemDeleter = {
  deleteFromItemIds,
  deleteManyItems,
}