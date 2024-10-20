import {cardCollectionRetriever} from "./CardCollectionRetriever";
import {itemRetriever} from "../item/ItemRetriever";
import {inventoryItemRetriever} from "../inventory/InventoryItemRetriever";
import {ItemEntity, legacyIdOrFallback} from "../item/ItemEntity";
import {cardCollectionOwnershipRetriever} from "./CardCollectionOwnershipRetriever";
import {cardQueryViewCountUpdater} from "../card/query/CardQueryViewCountEntity";
import {baseCardCollectionOwnershipUpdater} from "./CardCollectionOwnershipRepository";
import {dedupeInOrder} from "../../tools/ArrayDeduper";
import {flattenArray} from "../../tools/ArrayFlattener";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";


const sync = async (userId:string, collectionId:string) => {
  const parentCollection = await cardCollectionRetriever.retrieveParent(collectionId)
  const childCollections = await cardCollectionRetriever.retrieveDescendants(parentCollection.id)
  const allCollections = [parentCollection].concat(childCollections)
  if (allCollections.length === 0) {
    return
  }
  const allCollectionCardIds = dedupeInOrder(
    flattenArray(allCollections.map(col => col.cardIds)),
      i => i
  )
  const items = await itemRetriever.retrieveManyByIdOrLegacyId(allCollectionCardIds)
  const inventoryItems = await inventoryItemRetriever.retrieveByItemIdsAndUserId(
    items.map(item => legacyIdOrFallback(item)),
    userId
  )

  // check to see if the collection ownership and inventory items contain the same items
  const itemOrCardIdToItem = new Map<string, ItemEntity>()
  items.forEach(item => {
    itemOrCardIdToItem.set(item._id.toString(), item)
    if (item.legacyId) {
      itemOrCardIdToItem.set(item.legacyId, item)
    }
  })

  const ownedItemIds = new Set<string>()
  inventoryItems.forEach(inventoryItem => {
    const item = itemOrCardIdToItem.get(inventoryItem.itemId)
    if (!item) {
      return
    }
    ownedItemIds.add(item._id.toString())
  })

  const queue = new ConcurrentPromiseQueue<any>({maxNumberOfConcurrentPromises: 1})
  await Promise.all(allCollections.map(collection => queue.addPromise(async () => {
    const collectionOwnership = await cardCollectionOwnershipRetriever.retrieveOptionalByUserIdAndCollectionId(
      userId,
      collection.id
    )
    if (!collectionOwnership) {
      return
    }

    const newOwnedCardIds = new Array<string>()
    collection.cardIds.forEach(collectionCardId => {
      const item = itemOrCardIdToItem.get(collectionCardId)
      if (!item) {
        return
      }
      const isOwned = ownedItemIds.has(item._id.toString())
      if (isOwned) {
        newOwnedCardIds.push(collectionCardId)
      }
    })

    await baseCardCollectionOwnershipUpdater.updateOnly(collectionOwnership.id, {ownedCardIds: newOwnedCardIds})
  })))

}

const syncAll = async (userId:string, collectionIds:Array<string>)=> {
  const queue = new ConcurrentPromiseQueue<any>({maxNumberOfConcurrentPromises: 1})
  await Promise.all(collectionIds.map(collectionId => queue.addPromise(async () => {
    await sync(userId, collectionId)
  })))
}

export const cardCollectionOwnershipSyncer = {
  sync,
  syncAll,
}