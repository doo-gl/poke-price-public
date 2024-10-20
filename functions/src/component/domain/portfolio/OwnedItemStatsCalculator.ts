import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {OwnedItemStats, TopItem} from "./PortfolioStatsEntity";
import {ItemStat, StatCalculationContext} from "./StatCalculationContext";
import {CurrencyCode} from "../money/CurrencyCodes";
import {fromCurrencyAmountLike, Zero} from "../money/CurrencyAmount";
import {CardOwnershipEntity} from "../card-ownership/CardOwnershipEntity";
import {statRetriever} from "./StatRetriever";
import {ItemType} from "../item/ItemEntity";
import {toSet} from "../../tools/SetBuilder";


const OWNED_TOP_ITEM_LENGTH = 30;
const BY_VALUE_DESC = comparatorBuilder.objectAttributeDESC<TopItem, number>(value => value.amount.amountInMinorUnits)

const onItemsAdded = (items:Array<ItemStat>, ownedItemStats:OwnedItemStats):OwnedItemStats => {
  const currencyCode = ownedItemStats.totalValueOfOwnedItems.currencyCode
  let countToAdd = 0
  let valueToAdd = Zero(currencyCode)
  const topItems = ownedItemStats.mostValuableOwnedItems.slice()
  items.forEach(stat => {
    countToAdd++;
    if (!stat.soldPrice || stat.soldPrice?.currencyCode !== currencyCode) {
      return
    }
    const value = fromCurrencyAmountLike(stat.soldPrice)
    valueToAdd = valueToAdd.add(value)

    const leastValuableTopItem = topItems.length >= OWNED_TOP_ITEM_LENGTH
      ? topItems[topItems.length - 1]
      : null
    if (!leastValuableTopItem || fromCurrencyAmountLike(leastValuableTopItem.amount).lessThan(value)) {
      if (leastValuableTopItem) {
        topItems.pop()
      }
      topItems.push({
        itemId: stat.itemId,
        amount: value.toCurrencyAmountLike(),
      })
      topItems.sort(BY_VALUE_DESC)
    }
  })

  const totalValueOfOwnedItems = fromCurrencyAmountLike(ownedItemStats.totalValueOfOwnedItems).add(valueToAdd)

  return {
    totalNumberOfOwnedItems: ownedItemStats.totalNumberOfOwnedItems + countToAdd,
    totalValueOfOwnedItems: totalValueOfOwnedItems.toCurrencyAmountLike(),
    mostValuableOwnedItems: topItems,
    mostValuableOwnedItemsIds: topItems.map(item => item.itemId),
  }
}

const onItemsRemoved = (items:Array<ItemStat>, ownedItemStats:OwnedItemStats):OwnedItemStats => {
  const currencyCode = ownedItemStats.totalValueOfOwnedItems.currencyCode
  let countToRemove = 0
  let valueToRemove = Zero(currencyCode)

  items.forEach(stat => {
    countToRemove++;
    if (!stat.soldPrice || stat.soldPrice?.currencyCode !== currencyCode) {
      return
    }
    const value = fromCurrencyAmountLike(stat.soldPrice)
    valueToRemove = valueToRemove.add(value)
  })

  const itemIdsToRemove = toSet(items, input => input.itemId)
  const topItems = ownedItemStats.mostValuableOwnedItems.slice()
    .filter(item => !itemIdsToRemove.has(item.itemId))
  topItems.sort(BY_VALUE_DESC)

  const newTotalValueOfOwnedItems = fromCurrencyAmountLike(ownedItemStats.totalValueOfOwnedItems).subtract(valueToRemove);
  const totalValueOfOwnedItems = newTotalValueOfOwnedItems.isPositive()
    ? newTotalValueOfOwnedItems
    : Zero(currencyCode)

  const totalNumberOfOwnedItems = ownedItemStats.totalNumberOfOwnedItems - countToRemove
  return {
    totalNumberOfOwnedItems: totalNumberOfOwnedItems >= 0 ? totalNumberOfOwnedItems : 0,
    totalValueOfOwnedItems: totalValueOfOwnedItems.toCurrencyAmountLike(),
    mostValuableOwnedItems: topItems,
    mostValuableOwnedItemsIds: topItems.map(item => item.itemId),
  }
}

const calculate = (context:StatCalculationContext):OwnedItemStats => {
  const items = context.getAllStats()
  return onItemsAdded(
    items,
    {
      totalValueOfOwnedItems: { amountInMinorUnits: 0, currencyCode: context.getUserCurrencyCode() },
      totalNumberOfOwnedItems: 0,
      mostValuableOwnedItems: [],
      mostValuableOwnedItemsIds: [],
    }
  )
}

const onOwnershipsAdded = async (ownerships:Array<CardOwnershipEntity>, ownedItemStats:OwnedItemStats):Promise<OwnedItemStats> => {
  const itemIds = ownerships.map(ownership => ownership.cardId)
  const currencyCode = ownedItemStats.totalValueOfOwnedItems.currencyCode
  const items = await statRetriever.retrieveMany(itemIds, currencyCode)
  return onItemsAdded(
    items,
    ownedItemStats
  )
}

const onOwnershipsRemoved = async (ownerships:Array<CardOwnershipEntity>, ownedItemStats:OwnedItemStats):Promise<OwnedItemStats> => {
  const itemIds = ownerships.map(ownership => ownership.cardId)
  const currencyCode = ownedItemStats.totalValueOfOwnedItems.currencyCode
  const items = await statRetriever.retrieveMany(itemIds, currencyCode)
  return onItemsRemoved(
    items,
    ownedItemStats
  )
}

export const ownedItemStatsCalculator = {
  calculate,
  onOwnershipsAdded,
  onOwnershipsRemoved,
  onItemsAdded,
  onItemsRemoved,
}