import {emptyItemStat, ItemStat, StatCalculationContext} from "./StatCalculationContext";
import {CardCollectionEntity} from "../card-collection/CardCollectionEntity";
import {SingleCollectionStats} from "./PortfolioStatsEntity";
import {fromCurrencyAmountLike, Zero} from "../money/CurrencyAmount";
import {toInputValueSet} from "../../tools/SetBuilder";
import {CardCollectionOwnershipEntity} from "../card-collection/CardCollectionOwnershipEntity";
import {CurrencyCode} from "../money/CurrencyCodes";
import {collectionPriceQuerier} from "../card-collection/CollectionPriceQuerier";


const onOwnedItemsAdded = (
  items:Array<ItemStat>,
  collection:CardCollectionEntity,
  singleCollectionStats:SingleCollectionStats,
):SingleCollectionStats => {
  const currencyCode = singleCollectionStats.totalValueOfItems.currencyCode
  let ownedCountToAdd = 0;
  let ownedValueToAdd = Zero(currencyCode)
  const visibleItemIds = toInputValueSet(collection.visibleCardIds)
  items
    .filter(item => visibleItemIds.has(item.itemId))
    .forEach(stat => {
      ownedCountToAdd++
      const soldPrice = stat.soldPrice
      if (!soldPrice || soldPrice.currencyCode !== currencyCode) {
        return
      }
      const value = fromCurrencyAmountLike(soldPrice)
      ownedValueToAdd = ownedValueToAdd.add(value)
    })

  const totalNumberOfItems = singleCollectionStats.totalNumberOfItems
  const totalValueOfItems = fromCurrencyAmountLike(singleCollectionStats.totalValueOfItems)
  const previousTotalValueOfOwnedItems = fromCurrencyAmountLike(singleCollectionStats.totalValueOfOwnedItems)
  const newTotalValueOfOwnedItems = previousTotalValueOfOwnedItems.add(ownedValueToAdd)
  const totalValueOfOwnedItems = newTotalValueOfOwnedItems.lessThanOrEqual(totalValueOfItems)
    ? newTotalValueOfOwnedItems
    : totalValueOfItems
  const totalNumberOfOwnedItems = Math.min(
    totalNumberOfItems,
    singleCollectionStats.totalNumberOfOwnedItems + ownedCountToAdd
  )
  const collectionValueCompletionPercentage = totalValueOfItems.amountInMinorUnits > 0
    ? Math.round((totalValueOfOwnedItems.amountInMinorUnits / totalValueOfItems.amountInMinorUnits) * 1000) / 10
    : 0
  const collectionCompletionPercentage = totalNumberOfItems > 0
    ? Math.round((totalNumberOfOwnedItems / totalNumberOfItems) * 1000) / 10
    : 0

  return {
    collectionId: singleCollectionStats.collectionId,
    totalNumberOfItems,
    totalNumberOfOwnedItems,
    totalValueOfItems: totalValueOfItems.toCurrencyAmountLike(),
    totalValueOfOwnedItems: totalValueOfOwnedItems.toCurrencyAmountLike(),
    collectionCompletionPercentage,
    collectionValueCompletionPercentage,
  }
}

const onOwnedItemsRemoved = (
  items:Array<ItemStat>,
  collection:CardCollectionEntity,
  singleCollectionStats:SingleCollectionStats,
):SingleCollectionStats => {
  const currencyCode = singleCollectionStats.totalValueOfItems.currencyCode
  let ownedCountToRemove = 0;
  let ownedValueToRemove = Zero(currencyCode)
  const visibleItemIds = toInputValueSet(collection.visibleCardIds)
  items
    .filter(item => visibleItemIds.has(item.itemId))
    .forEach(stat => {
      ownedCountToRemove++
      const soldPrice = stat.soldPrice
      if (!soldPrice || soldPrice.currencyCode !== currencyCode) {
        return
      }
      const value = fromCurrencyAmountLike(soldPrice)
      ownedValueToRemove = ownedValueToRemove.add(value)
    })

  const totalNumberOfItems = singleCollectionStats.totalNumberOfItems
  const totalValueOfItems = fromCurrencyAmountLike(singleCollectionStats.totalValueOfItems)
  const previousTotalValueOfOwnedItems = fromCurrencyAmountLike(singleCollectionStats.totalValueOfOwnedItems)
  const newTotalValueOfOwnedItems = previousTotalValueOfOwnedItems.subtract(ownedValueToRemove)
  const totalValueOfOwnedItems = newTotalValueOfOwnedItems.greaterThan(Zero(currencyCode))
    ? newTotalValueOfOwnedItems
    : Zero(currencyCode)
  const totalNumberOfOwnedItems = Math.max(
    0,
    singleCollectionStats.totalNumberOfOwnedItems - ownedCountToRemove
  )
  const collectionValueCompletionPercentage = totalValueOfItems.amountInMinorUnits > 0
    ? Math.round((totalValueOfOwnedItems.amountInMinorUnits / totalValueOfItems.amountInMinorUnits) * 1000) / 10
    : 0
  const collectionCompletionPercentage = totalNumberOfItems > 0
    ? Math.round((totalNumberOfOwnedItems / totalNumberOfItems) * 1000) / 10
    : 0

  return {
    collectionId: singleCollectionStats.collectionId,
    totalNumberOfItems,
    totalNumberOfOwnedItems,
    totalValueOfItems: totalValueOfItems.toCurrencyAmountLike(),
    totalValueOfOwnedItems: totalValueOfOwnedItems.toCurrencyAmountLike(),
    collectionCompletionPercentage,
    collectionValueCompletionPercentage,
  }
}

const calculate = (
  ownedCardIds:Array<string>,
  collection:CardCollectionEntity,
  context:StatCalculationContext,
):SingleCollectionStats => {
  const collectionId = collection.id;
  const totalNumberOfItems = collection.visibleCardIds.length
  const priceStats = collectionPriceQuerier.query(collection, context.getUserCurrencyCode())
  const totalValueOfItems = priceStats?.visibleTotalPrice ?? Zero(context.getUserCurrencyCode()).toCurrencyAmountLike()
  const ownedItems:Array<ItemStat> = []
  const ownedCardIdSet = toInputValueSet(ownedCardIds)
  collection.visibleCardIds.forEach(cardId => {
    const stat = context.getStat(cardId)
    if (ownedCardIdSet.has(cardId)) {
      ownedItems.push(stat ?? emptyItemStat(cardId))
    }
  })
  const statsWithoutOwnership:SingleCollectionStats = {
    collectionId,
    totalNumberOfItems,
    totalValueOfItems: totalValueOfItems,
    totalNumberOfOwnedItems: 0,
    totalValueOfOwnedItems: Zero(context.getUserCurrencyCode()).toCurrencyAmountLike(),
    collectionValueCompletionPercentage: 0,
    collectionCompletionPercentage: 0,
  }

  return onOwnedItemsAdded(
    ownedItems,
    collection,
    statsWithoutOwnership
  )
}

export const ownedSingleCollectionStatsCalculator = {
  calculate,
  onOwnedItemsAdded,
  onOwnedItemsRemoved,
}