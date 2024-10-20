import {StatCalculationContext} from "./StatCalculationContext";
import {CardCollectionEntity} from "../card-collection/CardCollectionEntity";
import {CurrencyCode} from "../money/CurrencyCodes";
import {dedupe} from "../../tools/ArrayDeduper";

export interface UniqueItemsInCollectionStats {
  totalUniqueItemsOwnedInStartedCollections:number,
  totalUniqueItemsNeededInStartedCollections:number,
  totalUniqueItemsInStartedCollections:number,
}

const countItemsInCollections = (itemIds:Array<string>, collections:Array<CardCollectionEntity>):number => {
  const itemIdToCollections = new Map<string, Array<CardCollectionEntity>>()
  collections.forEach(collection => {
    collection.visibleCardIds.forEach(itemId => {
      const collectionsForItemId = itemIdToCollections.get(itemId) ?? []
      collectionsForItemId.push(collection)
      itemIdToCollections.set(itemId, collectionsForItemId)
    })
  })

  let countOfItemsInCollections = 0
  itemIds.forEach(itemId => {
    const collectionsForItem = itemIdToCollections.get(itemId) ?? null
    if (collectionsForItem) {
      countOfItemsInCollections++
    }
  })
  return countOfItemsInCollections
}

const countUniqueItemsInCollections = (collections:Array<CardCollectionEntity>):number => {
  const itemIds = new Set<string>()
  collections.forEach(collection => {
    collection.visibleCardIds.forEach(itemId => {
      itemIds.add(itemId)
    })
  })
  return itemIds.size
}

const onOwnedItemsAdded = (
  itemIds:Array<string>,
  collections:Array<CardCollectionEntity>,
  uniqueItemsInCollectionStats:UniqueItemsInCollectionStats,
):UniqueItemsInCollectionStats => {
  const uniqueItemIds = dedupe(itemIds, i => i)
  const countOfItemsInCollections = countItemsInCollections(uniqueItemIds, collections)
  const totalUniqueItemsInStartedCollections = countUniqueItemsInCollections(collections)
  const totalUniqueItemsOwnedInStartedCollections = Math.min(
    uniqueItemsInCollectionStats.totalUniqueItemsOwnedInStartedCollections + countOfItemsInCollections,
    totalUniqueItemsInStartedCollections
  );
  const totalUniqueItemsNeededInStartedCollections = totalUniqueItemsInStartedCollections - totalUniqueItemsOwnedInStartedCollections

  return {
    totalUniqueItemsInStartedCollections,
    totalUniqueItemsOwnedInStartedCollections,
    totalUniqueItemsNeededInStartedCollections,
  }
}

const onOwnedItemsRemoved = (
  itemIds:Array<string>,
  collections:Array<CardCollectionEntity>,
  uniqueItemsInCollectionStats:UniqueItemsInCollectionStats,
):UniqueItemsInCollectionStats => {
  const uniqueItemIds = dedupe(itemIds, i => i)
  const countOfItemsInCollections = countItemsInCollections(uniqueItemIds, collections)
  const totalUniqueItemsInStartedCollections = countUniqueItemsInCollections(collections)
  const totalUniqueItemsOwnedInStartedCollections = Math.max(
    uniqueItemsInCollectionStats.totalUniqueItemsOwnedInStartedCollections - countOfItemsInCollections,
    0
  );
  const totalUniqueItemsNeededInStartedCollections = totalUniqueItemsInStartedCollections - totalUniqueItemsOwnedInStartedCollections

  return {
    totalUniqueItemsInStartedCollections,
    totalUniqueItemsOwnedInStartedCollections,
    totalUniqueItemsNeededInStartedCollections,
  }
}

const calculate = (
  ownedItemIds:Array<string>,
  collections:Array<CardCollectionEntity>,
  context:StatCalculationContext,
):UniqueItemsInCollectionStats => {

  const emptyStats:UniqueItemsInCollectionStats = {
    totalUniqueItemsInStartedCollections: 0,
    totalUniqueItemsOwnedInStartedCollections: 0,
    totalUniqueItemsNeededInStartedCollections: 0,
  }

  return onOwnedItemsAdded(
    ownedItemIds,
    collections,
    emptyStats,
  )
}

export const uniqueItemsInCollectionStatsCalculator = {
  calculate,
  onOwnedItemsAdded,
  onOwnedItemsRemoved,
}