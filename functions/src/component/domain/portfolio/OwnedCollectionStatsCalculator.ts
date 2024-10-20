import {ItemStat, StatCalculationContext} from "./StatCalculationContext";
import {CurrencyCode} from "../money/CurrencyCodes";
import {OwnedCollectionStats, SingleCollectionStats, TopCollection} from "./PortfolioStatsEntity";
import {
  baseCardCollectionOwnershipUpdater,
  cardCollectionOwnershipRepository,
} from "../card-collection/CardCollectionOwnershipRepository";
import {cardCollectionRetriever} from "../card-collection/CardCollectionRetriever";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {CardOwnershipEntity} from "../card-ownership/CardOwnershipEntity";
import {toInputValueMap, toInputValueMultiMap} from "../../tools/MapBuilder";
import {ownedSingleCollectionStatsCalculator} from "./OwnedSingleCollectionStatsCalculator";
import {statRetriever} from "./StatRetriever";
import {CardCollectionEntity} from "../card-collection/CardCollectionEntity";
import {timestampToMoment} from "../../tools/TimeConverter";
import moment from "moment/moment";
import {TimestampStatic} from "../../external-lib/Firebase";
import {collectionStatsUpdater} from "../card-collection/CollectionStatsUpdater";
import {dedupe} from "../../tools/ArrayDeduper";
import {toInputValueSet, toSet} from "../../tools/SetBuilder";
import {Zero} from "../money/CurrencyAmount";
import {collectionPriceQuerier} from "../card-collection/CollectionPriceQuerier";
import {CardCollectionOwnershipEntity} from "../card-collection/CardCollectionOwnershipEntity";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";
import {removeNulls} from "../../tools/ArrayNullRemover";
import {intersection} from "../../tools/SetOperations";
import {logger} from "firebase-functions";

const TOP_COLLECTION_LENGTH = 20;
const BY_COMPLETION_THEN_VALUE_DESC = comparatorBuilder.combineAll(
  comparatorBuilder.objectAttributeDESC<TopCollection, number>(value => value.collectionCompletionPercentage),
  comparatorBuilder.objectAttributeDESC<TopCollection, number>(value => value.collectionValueCompletionPercentage),
  comparatorBuilder.objectAttributeDESC<TopCollection, number>(value => value.totalValueOfOwnedItems.amountInMinorUnits),
)


export interface CollectionWithOwnership {
  collection:CardCollectionEntity,
  ownership:CardCollectionOwnershipEntity,
}

const onOwnedItemsAddedToCollections = (
  items:Array<ItemStat>,
  currentOwnedCollectionStats:OwnedCollectionStats,
  collections:Array<CollectionWithOwnership>,
):OwnedCollectionStats => {

  const currencyCode = currentOwnedCollectionStats.collectionStats.find(() => true)?.totalValueOfItems?.currencyCode
    ?? items.filter(item => !!item.soldPrice).find(() => true)?.soldPrice?.currencyCode
    ?? null

  const itemIdToItem = toInputValueMap(items, it => it.itemId)
  const updatedSingleCollectionStats = new Array<SingleCollectionStats>()

  collections.forEach(collection => {
    const needsRecalulating = collection.collection.cardIds.some(cardId => itemIdToItem.has(cardId))
    if (!needsRecalulating) {
      return
    }

    let currentSingleCollectionStat:SingleCollectionStats|null = currentOwnedCollectionStats.collectionStats.find(col => col.collectionId === collection.collection.id) ?? null
    if (!currentSingleCollectionStat && currencyCode) {
      currentSingleCollectionStat = {
        collectionId: collection.collection.id,
        collectionCompletionPercentage: 0,
        totalNumberOfOwnedItems: 0,
        collectionValueCompletionPercentage: 0,
        totalNumberOfItems: collection.collection.statsV2.count,
        totalValueOfOwnedItems: Zero(currencyCode),
        totalValueOfItems: collectionPriceQuerier.query(collection.collection, currencyCode)?.visibleTotalPrice ?? Zero(currencyCode),
      }
    }
    if (currentSingleCollectionStat) {
      const newSingleCollectionStat = ownedSingleCollectionStatsCalculator.onOwnedItemsAdded(items, collection.collection, currentSingleCollectionStat)
      updatedSingleCollectionStats.push(newSingleCollectionStat)
    }
  })

  const updatedCollectionIds = toSet(updatedSingleCollectionStats, col => col.collectionId)
  const newSingleCollectionStats = currentOwnedCollectionStats.collectionStats
    .filter(col => !updatedCollectionIds.has(col.collectionId))
    .concat(updatedSingleCollectionStats)


  return calculateFromCollectionStats(newSingleCollectionStats)
}

const onOwnedItemsAdded = async (
  items:Array<ItemStat>,
  ownedCollectionStats:OwnedCollectionStats
):Promise<OwnedCollectionStats> => {

  const preExistingCollectionStats = ownedCollectionStats.collectionStats
  const preExistingCollectionIds = toSet(preExistingCollectionStats, stat => stat.collectionId)

  const collectionsForNewItems = await cardCollectionRetriever.retrieveForCardIds(items.map(item => item.itemId))
  const collectionsForCollectionStats = await cardCollectionRetriever.retrieveVisibleByIds(preExistingCollectionStats.map(stat => stat.collectionId))

  // make a best effort to find the currency code
  const currencyCode = ownedCollectionStats.collectionStats.find(stat => true)?.totalValueOfItems?.currencyCode
    ?? items.filter(item => !!item.soldPrice).find(() => true)?.soldPrice?.currencyCode
    ?? null

  const singleCollectionStats = preExistingCollectionStats

  // if we can find a currency code, then look through then work out which collections do not exist on the stats
  // and add blank entries for them
  if (currencyCode) {
    const newCollections = collectionsForNewItems.filter(col => !preExistingCollectionIds.has(col.id))
    const newCollectionStats = newCollections.map<SingleCollectionStats>(col => ({
      collectionId: col.id,
      collectionCompletionPercentage: 0,
      totalNumberOfOwnedItems: 0,
      collectionValueCompletionPercentage: 0,
      totalNumberOfItems: col.statsV2.count,
      totalValueOfOwnedItems: Zero(currencyCode),
      totalValueOfItems: collectionPriceQuerier.query(col, currencyCode)?.visibleTotalPrice ?? Zero(currencyCode),
    }))
    newCollectionStats.forEach(stat => singleCollectionStats.push(stat))
  }

  // add the pre-existing and new collections together
  const collections = dedupe(collectionsForNewItems.concat(collectionsForCollectionStats), col => col.id)
  const collectionIdToCollection = toInputValueMap(collections, input => input.id)

  const updatedSingleCollectionStats:Array<SingleCollectionStats> = []
  singleCollectionStats.forEach(singleCollectionStat => {
    const collection = collectionIdToCollection.get(singleCollectionStat.collectionId)
    if (!collection) {
      return;
    }
    const updatedStats = ownedSingleCollectionStatsCalculator.onOwnedItemsAdded(items, collection, singleCollectionStat)
    updatedSingleCollectionStats.push(updatedStats)
  })

  return calculateFromCollectionStats(updatedSingleCollectionStats)
}

const onOwnedItemsRemoved = async (
  items:Array<ItemStat>,
  ownedCollectionStats:OwnedCollectionStats
):Promise<OwnedCollectionStats> => {
  const singleCollectionStats = ownedCollectionStats.collectionStats
  const collections = await cardCollectionRetriever.retrieveVisibleByIds(singleCollectionStats.map(stat => stat.collectionId))
  const collectionIdToCollection = toInputValueMap(collections, input => input.id)
  const updatedSingleCollectionStats:Array<SingleCollectionStats> = []
  singleCollectionStats.forEach(singleCollectionStat => {
    const collection = collectionIdToCollection.get(singleCollectionStat.collectionId)
    if (!collection) {
      return;
    }
    const updatedStats = ownedSingleCollectionStatsCalculator.onOwnedItemsRemoved(items, collection, singleCollectionStat)
    updatedSingleCollectionStats.push(updatedStats)
  })

  return calculateFromCollectionStats(updatedSingleCollectionStats)
}

const calculateFromCollectionStats = (singleCollectionStats:Array<SingleCollectionStats>):OwnedCollectionStats => {

  const topCollections:Array<TopCollection> = []
  let totalCollectionItems = 0;
  let totalCollectionItemsOwned = 0;
  let totalCollectionsStarted = 0;
  let totalCollectionsCompleted = 0;

  singleCollectionStats.forEach(singleCollectionStat => {
    totalCollectionItemsOwned += singleCollectionStat.totalNumberOfOwnedItems;
    totalCollectionItems += singleCollectionStat.totalNumberOfItems;
    totalCollectionsStarted++;
    if (singleCollectionStat.totalNumberOfOwnedItems === singleCollectionStat.totalNumberOfItems) {
      totalCollectionsCompleted++;
    }

    const leastCompleteTopCollection = topCollections.length >= TOP_COLLECTION_LENGTH
      ? topCollections[topCollections.length - 1]
      : null
    if (
      !leastCompleteTopCollection
      || (
        singleCollectionStat.collectionCompletionPercentage >= leastCompleteTopCollection.collectionCompletionPercentage
        && singleCollectionStat.collectionValueCompletionPercentage >= leastCompleteTopCollection.collectionValueCompletionPercentage
        && singleCollectionStat.totalValueOfOwnedItems.amountInMinorUnits > leastCompleteTopCollection.totalValueOfOwnedItems.amountInMinorUnits
      )
    ) {
      if (leastCompleteTopCollection) {
        topCollections.pop()
      }
      topCollections.push({
        collectionId: singleCollectionStat.collectionId,
        collectionCompletionPercentage: singleCollectionStat.collectionCompletionPercentage,
        collectionValueCompletionPercentage: singleCollectionStat.collectionValueCompletionPercentage,
        totalValueOfOwnedItems: singleCollectionStat.totalValueOfOwnedItems,
      })
      topCollections.sort(BY_COMPLETION_THEN_VALUE_DESC)
    }
  })

  const totalCollectionCompletionPercentage = totalCollectionItems > 0
    ? Math.round((totalCollectionItemsOwned / totalCollectionItems) * 1000) / 10
    : 0;

  return {
    collectionStats: singleCollectionStats,
    topCollections,
    topCollectionIds: topCollections.map(collection => collection.collectionId),
    totalCollectionItems,
    totalCollectionItemsOwned,
    totalCollectionCompletionPercentage,
    totalCollectionsStarted,
    totalCollectionsCompleted,
    totalUniqueItemsInStartedCollections: totalCollectionItems,
    totalUniqueItemsOwnedInStartedCollections: totalCollectionItemsOwned,
    totalUniqueItemsNeededInStartedCollections: totalCollectionItems - totalCollectionItemsOwned,
  }
}

const updateCollectionStats = async (collection:CardCollectionEntity):Promise<CardCollectionEntity> => {
  const lastUpdated = timestampToMoment(collection.statsV2?.lastUpdatedAt ?? TimestampStatic.fromMillis(0))
  if (lastUpdated.isAfter(moment().subtract(1, 'day'))) {
    return collection
  }
  await collectionStatsUpdater.update(collection.id)
  return cardCollectionRetriever.retrieve(collection.id)
}

const calculateV2 = async (userId:string, context:StatCalculationContext):Promise<OwnedCollectionStats> => {
  let collections:Array<CardCollectionEntity> = []
  let collectionOwnerships:Array<CardCollectionOwnershipEntity> = []

  await cardCollectionOwnershipRepository.iterator()
    .batchSize(5)
    .queries([
      { field: 'userId', operation: '==', value: userId },
    ])
    .iterate(async collectionOwnership => {
      const collection = await cardCollectionRetriever.retrieve(collectionOwnership.cardCollectionId)
      collections.push(collection)
      collectionOwnerships.push(collectionOwnership)
    })

  const queue = new ConcurrentPromiseQueue<any>({maxNumberOfConcurrentPromises: 4})
  collections = removeNulls(await Promise.all(collections.map(collection => queue.addPromise(async () => {
    if (collection.parentCollectionId) {
      return collection
    }
    const updatedCollection = await updateCollectionStats(collection)
    return updatedCollection
  }))))

  const collectionIdToCollection = toInputValueMap(collections, val => val.id)

  const collectionIdToCollectionOwnership = toInputValueMultiMap(collectionOwnerships, val => val.cardCollectionId)
  collectionOwnerships = removeNulls(await Promise.all(
    [...collectionIdToCollectionOwnership.values()].map(collectionOwnershipGroup => queue.addPromise(async () => {

      // check to see if there are multiple ownerships for this collection
      // if so, delete all but the first
      let collectionOwnership:CardCollectionOwnershipEntity
      if (collectionOwnershipGroup.length > 1) {
        const sortedGroup = collectionOwnershipGroup.slice().sort(comparatorBuilder.combineAll(
          comparatorBuilder.objectAttributeASC(value => value.dateCreated.toDate().getTime()),
          comparatorBuilder.objectAttributeASC(value => value.id),
        ))
        collectionOwnership = sortedGroup[0]
        const collectionOwnershipIdsToDelete = sortedGroup.slice(1).map(val => val.id)
        logger.warn(`User:  ${userId}, has ${sortedGroup.length} ownerships for collection: ${collectionOwnership.cardCollectionId}, deleting: [${collectionOwnershipIdsToDelete.join(", ")}]`)
        await cardCollectionOwnershipRepository.batchDelete(collectionOwnershipIdsToDelete)
      } else {
        collectionOwnership = collectionOwnershipGroup[0]
      }

      const collection = collectionIdToCollection.get(collectionOwnership.cardCollectionId) ?? null
      if (!collection) {
        return null
      }
      // use the context to determine how much of each collection the user owns
      // compare that to what the collection ownership has recorded
      // if they are different, update them
      const itemsInCollection = collection.cardIds
      const ownedItemIdsInCollection = new Set<string>()
      itemsInCollection.forEach(itemId => {
        if (context.ownsItem(itemId)) {
          ownedItemIdsInCollection.add(itemId)
        }
      })
      const collectionOwnershipItemIds = toInputValueSet(collectionOwnership.ownedCardIds)
      const inter = intersection(ownedItemIdsInCollection, collectionOwnershipItemIds)
      if (inter.size !== ownedItemIdsInCollection.size) {
        logger.warn(`User:  ${userId}, inconsistent ownership in collection: ${collection.id}, ownership has ${collectionOwnershipItemIds.size} ids, user owns: ${ownedItemIdsInCollection.size}`)
        const newOwnedCardIds = [...ownedItemIdsInCollection.values()].sort(comparatorBuilder.objectAttributeASC(val => val))
        collectionOwnership = await baseCardCollectionOwnershipUpdater.updateAndReturn(
          collectionOwnership.id,
          {ownedCardIds: newOwnedCardIds}
        )
      }
      return collectionOwnership
    }))
  ))

  const singleCollectionStats:Array<SingleCollectionStats> = []
  const topLevelCollections:Array<CardCollectionEntity> = []
  const ownedItemIds = new Set<string>()
  collectionOwnerships.forEach(collectionOwnership => {
    const collection = collectionIdToCollection.get(collectionOwnership.cardCollectionId) ?? null
    if (!collection || collection.parentCollectionId) {
      return
    }
    const stats = ownedSingleCollectionStatsCalculator.calculate(collectionOwnership.ownedCardIds, collection, context)
    if (stats) {
      singleCollectionStats.push(stats)
    }
    topLevelCollections.push(collection)
    collectionOwnership.ownedCardIds.forEach(itemId => {
      ownedItemIds.add(itemId)
    })
  })

  return calculateFromCollectionStats(singleCollectionStats)
}

const calculate = async (userId:string, context:StatCalculationContext):Promise<OwnedCollectionStats> => {
  const singleCollectionStats:Array<SingleCollectionStats> = []
  const collections:Array<CardCollectionEntity> = []
  const ownedItemIds = new Set<string>()
  await cardCollectionOwnershipRepository.iterator()
    .batchSize(5)
    .queries([
      { field: 'userId', operation: '==', value: userId },
    ])
    .iterate(async collectionOwnership => {
      const collection = await cardCollectionRetriever.retrieve(collectionOwnership.cardCollectionId)
      if (collection.parentCollectionId) {
        return
      }
      const updatedCollection = await updateCollectionStats(collection)
      const stats = ownedSingleCollectionStatsCalculator.calculate(collectionOwnership.ownedCardIds, updatedCollection, context)
      if (stats) {
        singleCollectionStats.push(stats)
      }
      collections.push(updatedCollection)
      collectionOwnership.ownedCardIds.forEach(itemId => {
        ownedItemIds.add(itemId)
      })
    })

  return calculateFromCollectionStats(singleCollectionStats)
}

const onOwnershipsAdded = async (currencyCode:CurrencyCode, ownerships:Array<CardOwnershipEntity>, collectionStats:OwnedCollectionStats):Promise<OwnedCollectionStats> => {
  const itemIds = ownerships.map(ownership => ownership.cardId)
  const items = await statRetriever.retrieveMany(itemIds, currencyCode)
  return onOwnedItemsAdded(
    items,
    collectionStats
  )
}

const onOwnershipsRemoved = async (currencyCode:CurrencyCode, ownerships:Array<CardOwnershipEntity>, collectionStats:OwnedCollectionStats):Promise<OwnedCollectionStats> => {
  const itemIds = ownerships.map(ownership => ownership.cardId)
  const items = await statRetriever.retrieveMany(itemIds, currencyCode)
  return onOwnedItemsRemoved(
    items,
    collectionStats
  )
}

/**
 * @deprecated - use collectionStatsCalculator instead
 */
export const ownedCollectionStatsCalculator = {
  calculate: calculateV2,
  calculateFromCollectionStats,
  onOwnershipsAdded,
  onOwnershipsRemoved,
}