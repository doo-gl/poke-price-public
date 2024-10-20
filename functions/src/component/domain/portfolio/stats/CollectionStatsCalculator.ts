import {OwnedCollectionStats, SingleCollectionStats, TopCollection} from "../PortfolioStatsEntity";
import {ItemStat, StatCalculationContext} from "../StatCalculationContext";
import {CardCollectionEntity} from "../../card-collection/CardCollectionEntity";
import {comparatorBuilder} from "../../../infrastructure/ComparatorBuilder";
import {toInputValueMap} from "../../../tools/MapBuilder";
import {fromCurrencyAmountLike, Zero} from "../../money/CurrencyAmount";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {ownedSingleCollectionStatsCalculator} from "../OwnedSingleCollectionStatsCalculator";
import {collectionPriceQuerier} from "../../card-collection/CollectionPriceQuerier";
import {toSet} from "../../../tools/SetBuilder";

type AggregateCollectionStats = Omit<OwnedCollectionStats, 'collectionStats'>

const TOP_COLLECTION_LENGTH = 20;
const BY_COMPLETION_THEN_VALUE_DESC = comparatorBuilder.combineAll(
  comparatorBuilder.objectAttributeDESC<TopCollection, number>(value => value.collectionCompletionPercentage),
  comparatorBuilder.objectAttributeDESC<TopCollection, number>(value => value.collectionValueCompletionPercentage),
  comparatorBuilder.objectAttributeDESC<TopCollection, number>(value => value.totalValueOfOwnedItems.amountInMinorUnits),
)

const emptySingleCollectionStats = (userCurrencyCode:CurrencyCode, collection:CardCollectionEntity):SingleCollectionStats => {

  const priceStats = collectionPriceQuerier.query(collection, userCurrencyCode)
  const totalValueOfItems = priceStats?.visibleTotalPrice ?? Zero(userCurrencyCode).toCurrencyAmountLike()

  return {
    collectionId: collection.id,
    totalNumberOfItems: collection.visibleCardIds.length,
    totalValueOfItems: totalValueOfItems,
    totalNumberOfOwnedItems: 0,
    totalValueOfOwnedItems: Zero(userCurrencyCode).toCurrencyAmountLike(),
    collectionValueCompletionPercentage: 0,
    collectionCompletionPercentage: 0,
  }
}

const calculateAggregateCollectionStats = (singleCollectionStats:Array<SingleCollectionStats>):AggregateCollectionStats => {
  const topCollections:Array<TopCollection> = []
  let totalCollectionItemsOwned:number = 0
  let totalCollectionItems:number = 0
  let totalCollectionsStarted:number = 0
  let totalCollectionsCompleted:number = 0

  singleCollectionStats.forEach(singleCollectionStat => {

    totalCollectionItems += singleCollectionStat.totalNumberOfItems
    totalCollectionItemsOwned += singleCollectionStat.totalNumberOfOwnedItems
    totalCollectionsStarted++
    if (singleCollectionStat.totalNumberOfOwnedItems >= singleCollectionStat.totalNumberOfItems) {
      totalCollectionsCompleted++
    }

    const leastCompleteTopCollection = topCollections.length >= TOP_COLLECTION_LENGTH
      ? topCollections[topCollections.length - 1]
      : null;
    const isNewTopCollection = !leastCompleteTopCollection || (
      singleCollectionStat.collectionCompletionPercentage >= leastCompleteTopCollection.collectionCompletionPercentage
      && singleCollectionStat.collectionValueCompletionPercentage >= leastCompleteTopCollection.collectionValueCompletionPercentage
      && singleCollectionStat.totalValueOfOwnedItems.amountInMinorUnits > leastCompleteTopCollection.totalValueOfOwnedItems.amountInMinorUnits
    )

    if (isNewTopCollection) {
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

  // currently deprecated, but calculating anyway for completeness
  const totalUniqueItemsOwnedInStartedCollections = totalCollectionItemsOwned
  const totalUniqueItemsInStartedCollections = totalCollectionItems
  const totalUniqueItemsNeededInStartedCollections = totalCollectionItems - totalCollectionItemsOwned

  return {
    topCollections,
    topCollectionIds: topCollections.map(collection => collection.collectionId),
    totalCollectionCompletionPercentage,
    totalCollectionItems,
    totalCollectionItemsOwned,
    totalCollectionsStarted,
    totalCollectionsCompleted,
    totalUniqueItemsOwnedInStartedCollections,
    totalUniqueItemsInStartedCollections,
    totalUniqueItemsNeededInStartedCollections,
  }
}

const onOwnedItemsAdded = (
  currentCollectionStats:OwnedCollectionStats,
  ownedItemsAdded:Array<ItemStat>,
  collectionsForItems:Array<CardCollectionEntity>,
):OwnedCollectionStats => {

  const userCurrencyCode = currentCollectionStats.collectionStats.find(() => true)?.totalValueOfOwnedItems.currencyCode ?? CurrencyCode.GBP
  const rootCollections = collectionsForItems.filter(collection => !collection.parentCollectionId)

  const itemIdToItem = toInputValueMap(ownedItemsAdded, it => it.itemId)

  const updatedCollectionStats = new Array<SingleCollectionStats>()
  rootCollections.forEach(collection => {
    const newItemsInCollection = new Array<ItemStat>()
    collection.visibleCardIds.forEach(cardId => {
      const item = itemIdToItem.get(cardId)
      if (!item) {
        return
      }
      newItemsInCollection.push(item)
    })

    if (newItemsInCollection.length === 0) {
      return;
    }


    const currentSingleCollectionStats:SingleCollectionStats = currentCollectionStats.collectionStats.find(
      col => col.collectionId === collection.id
    ) ?? emptySingleCollectionStats(userCurrencyCode, collection)

    const newSingleCollectionStats = ownedSingleCollectionStatsCalculator.onOwnedItemsAdded(
      newItemsInCollection,
      collection,
      currentSingleCollectionStats
    )

    updatedCollectionStats.push(newSingleCollectionStats)
  })
  const updatedCollectionIds = toSet(updatedCollectionStats, col => col.collectionId)

  const singleCollectionStatsWithUpdates = currentCollectionStats.collectionStats
    .filter(col => !updatedCollectionIds.has(col.collectionId))
    .concat(updatedCollectionStats)

  const result:OwnedCollectionStats = {
    collectionStats: singleCollectionStatsWithUpdates,
    ...calculateAggregateCollectionStats(singleCollectionStatsWithUpdates),
  }

  return result
}

const onOwnedItemsRemoved = (
  currentCollectionStats:OwnedCollectionStats,
  ownedItemsRemoved:Array<ItemStat>,
  collectionsForItems:Array<CardCollectionEntity>,
):OwnedCollectionStats => {

  const userCurrencyCode = currentCollectionStats.collectionStats.find(() => true)?.totalValueOfOwnedItems.currencyCode ?? CurrencyCode.GBP
  const rootCollections = collectionsForItems.filter(collection => !collection.parentCollectionId)

  const itemIdToItem = toInputValueMap(ownedItemsRemoved, it => it.itemId)

  const updatedCollectionStats = new Array<SingleCollectionStats>()
  rootCollections.forEach(collection => {
    const removedItemsInCollection = new Array<ItemStat>()
    collection.visibleCardIds.forEach(cardId => {
      const item = itemIdToItem.get(cardId)
      if (!item) {
        return
      }
      removedItemsInCollection.push(item)
    })

    if (removedItemsInCollection.length === 0) {
      return;
    }


    const currentSingleCollectionStats:SingleCollectionStats = currentCollectionStats.collectionStats.find(
      col => col.collectionId === collection.id
    ) ?? emptySingleCollectionStats(userCurrencyCode, collection)

    const newSingleCollectionStats = ownedSingleCollectionStatsCalculator.onOwnedItemsRemoved(
      removedItemsInCollection,
      collection,
      currentSingleCollectionStats
    )

    updatedCollectionStats.push(newSingleCollectionStats)
  })
  const updatedCollectionIds = toSet(updatedCollectionStats, col => col.collectionId)

  const singleCollectionStatsWithUpdates = currentCollectionStats.collectionStats
    .filter(col => !updatedCollectionIds.has(col.collectionId))
    .concat(
      updatedCollectionStats.filter(col => col.totalNumberOfOwnedItems > 0)
    )

  const result:OwnedCollectionStats = {
    collectionStats: singleCollectionStatsWithUpdates,
    ...calculateAggregateCollectionStats(singleCollectionStatsWithUpdates),
  }

  return result

}

const calculate = (context:StatCalculationContext):OwnedCollectionStats => {

  const singleCollectionStats = new Array<SingleCollectionStats>()
  context.getCollectionsWithOwnerships().forEach(collectionWithOwnership => {
    const collection = collectionWithOwnership.collection
    const ownership = collectionWithOwnership.ownership
    if (collection.parentCollectionId) {
      return;
    }

    const ownedCardIds = ownership.ownedCardIds;
    if (ownedCardIds.length === 0) {
      return;
    }

    const singleCollectionStat = ownedSingleCollectionStatsCalculator.calculate(
      ownedCardIds,
      collection,
      context,
    )
    singleCollectionStats.push(singleCollectionStat)
  })

  const result:OwnedCollectionStats = {
    collectionStats: singleCollectionStats,
    ...calculateAggregateCollectionStats(singleCollectionStats),
  }

  return result
}



export const collectionStatsCalculator = {
  calculate,
  onOwnedItemsAdded,
  onOwnedItemsRemoved,
  calculateAggregateCollectionStats,
}