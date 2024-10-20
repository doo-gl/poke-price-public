import {ItemStat, StatCalculationContext} from "./StatCalculationContext";
import {CurrencyCode} from "../money/CurrencyCodes";
import {InventoryItemStats, TopInventoryItem} from "./PortfolioStatsEntity";
import {InventoryItemEntity} from "../inventory/InventoryItemEntity";
import {CurrencyAmount, CurrencyAmountLike, fromCurrencyAmountLike, Zero} from "../money/CurrencyAmount";
import {ItemType, PriceSource} from "../item/ItemEntity";
import {CardCondition} from "../historical-card-price/CardCondition";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {statRetriever} from "./StatRetriever";
import {toInputValueMap, toInputValueMultiMap} from "../../tools/MapBuilder";
import {dedupe} from "../../tools/ArrayDeduper";
import {toSet} from "../../tools/SetBuilder";
import {flattenArray} from "../../tools/ArrayFlattener";
import {conditionalPokePriceConverter} from "../stats/card-v2/ConditionalPokePriceConverter";
import {toGradingDetails} from "../modification/ItemModification";
import {buildModificationKey} from "../modification/GradingIdentifier";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../marketplace/item-details/SinglePokemonCardItemDetails";

const TOP_INVENTORY_ITEM_LENGTH = 30;
const BY_VALUE_DESC = comparatorBuilder.objectAttributeDESC<TopInventoryItem, number>(value => value.value.amountInMinorUnits)

export interface InventoryItemWithStat {
  inventoryItem:InventoryItemEntity,
  item:ItemStat,
}

export interface InventoryItemPrice {
  price:CurrencyAmountLike,
  priceSource:PriceSource,
  modificationKey:string|null
}

const calculateInventoryItemPrice = (
  inventoryItemStat:InventoryItemWithStat,
  currencyCode:CurrencyCode,
):InventoryItemPrice|null => {
  const inventoryItem = inventoryItemStat.inventoryItem;
  const item = inventoryItemStat.item;
  const userPokePrice = inventoryItem.userPokePrice
  if (userPokePrice && userPokePrice.currencyCode === currencyCode) {
    return {price: userPokePrice, priceSource: PriceSource.USER_MANUALLY_SET, modificationKey: null}
  }
  const soldPriceSource = item.soldPriceSource
  const soldPrice = item.soldPrice
  if (!soldPrice || !soldPriceSource || soldPrice.currencyCode !== currencyCode) {
    return null
  }
  if (inventoryItem.itemType === ItemType.SINGLE_CARD || inventoryItem.itemType === SINGLE_POKEMON_CARD_ITEM_TYPE) {
    const gradeDetails = toGradingDetails(inventoryItem.itemDetails?.grade ?? null)
    if (gradeDetails) {
      const modificationKey = buildModificationKey(gradeDetails.graderKey, gradeDetails.grade)
      const modKeyToPrice = item.modificationKeyToPrice
      const modPrice = modKeyToPrice[modificationKey]
      if (!modPrice) {
        // inventory item was graded, but we don't have a price for it
        // so instead of using the Raw price which will be wrong, use no price
        return null
      }
      return {
        price: modPrice,
        priceSource: PriceSource.EBAY,
        modificationKey: modificationKey,
      }
    }
    const condition:CardCondition = inventoryItem.itemDetails?.condition
    if (!condition) {
      return {
        price: soldPrice,
        priceSource: soldPriceSource,
        modificationKey: null,
      }
    }
    const conditionalPrice = conditionalPokePriceConverter.convert(soldPrice, condition)
    return {
      price: conditionalPrice,
      priceSource: soldPriceSource,
      modificationKey: null,
    }
  }
  return {
    price: soldPrice,
    priceSource: soldPriceSource,
    modificationKey: null,
  }
}

const onItemsAdded = (
  inventoryItems:Array<InventoryItemWithStat>,
  inventoryItemStats:InventoryItemStats
):InventoryItemStats => {

  const currencyCode = inventoryItemStats.totalValueOfInventoryItems.currencyCode
  let individualItemsToAdd = 0
  let individualItemsWithAmountPaidToAdd = 0
  let valueOfInventoryItemsToAdd = Zero(currencyCode)
  let profitFromAmountPaidToAdd = Zero(currencyCode)
  let valueFromAmountPaidToAdd = Zero(currencyCode)
  const topInventoryItems:Array<TopInventoryItem> = inventoryItemStats.topInventoryItems.slice()

  inventoryItems.forEach(item => {
    const inventoryItem = item.inventoryItem
    const amountPaid = inventoryItem.amountPaid && inventoryItem.amountPaid.currencyCode === currencyCode
      ? fromCurrencyAmountLike(inventoryItem.amountPaid)
      : null

    individualItemsToAdd++;
    if (amountPaid) {
      individualItemsWithAmountPaidToAdd++
    }
    const optionalInventoryItemPrice = calculateInventoryItemPrice(item, currencyCode);
    if (!optionalInventoryItemPrice) {
      return
    }
    const inventoryItemPrice = fromCurrencyAmountLike(optionalInventoryItemPrice.price)
    valueOfInventoryItemsToAdd = valueOfInventoryItemsToAdd.add(inventoryItemPrice)

    let profit:CurrencyAmount|null = null
    if (amountPaid) {
      valueFromAmountPaidToAdd = valueFromAmountPaidToAdd.add(amountPaid)
      profit = inventoryItemPrice.subtract(amountPaid)
      profitFromAmountPaidToAdd = profitFromAmountPaidToAdd.add(profit)
    }

    const leastValuableTopItem = topInventoryItems.length >= TOP_INVENTORY_ITEM_LENGTH
      ? topInventoryItems[topInventoryItems.length - 1]
      : null
    if (!leastValuableTopItem || fromCurrencyAmountLike(leastValuableTopItem.value).lessThan(inventoryItemPrice)) {
      if (leastValuableTopItem) {
        topInventoryItems.pop()
      }
      topInventoryItems.push({
        inventoryItemId: inventoryItem.id,
        itemId: inventoryItem.itemId,
        amountPaid: amountPaid?.toCurrencyAmountLike() ?? null,
        value: inventoryItemPrice.toCurrencyAmountLike(),
        profit: profit?.toCurrencyAmountLike() ?? null,
        priceSource: optionalInventoryItemPrice.priceSource,
        modificationKey: optionalInventoryItemPrice.modificationKey,
      })
      topInventoryItems.sort(BY_VALUE_DESC)
    }
  })

  const totalNumberOfIndividualItems = inventoryItemStats.totalNumberOfIndividualItems + individualItemsToAdd;
  const totalNumberOfIndividualItemsWithAmountPaid = inventoryItemStats.totalNumberOfIndividualItemsWithAmountPaid + individualItemsWithAmountPaidToAdd;
  const totalValueOfInventoryItems = fromCurrencyAmountLike(inventoryItemStats.totalValueOfInventoryItems).add(valueOfInventoryItemsToAdd)
  const totalProfitFromAmountPaid = fromCurrencyAmountLike(inventoryItemStats.totalProfitFromAmountPaid).add(profitFromAmountPaidToAdd)
  const totalAmountPaid = fromCurrencyAmountLike(inventoryItemStats.totalAmountPaid).add(valueFromAmountPaidToAdd)

  return {
    totalNumberOfIndividualItems,
    totalNumberOfIndividualItemsWithAmountPaid,
    totalValueOfInventoryItems: totalValueOfInventoryItems.toCurrencyAmountLike(),
    totalProfitFromAmountPaid: totalProfitFromAmountPaid.toCurrencyAmountLike(),
    totalAmountPaid: totalAmountPaid.toCurrencyAmountLike(),
    topInventoryItems,
    topInventoryItemIds: topInventoryItems.map(item => item.inventoryItemId),
  }
}

const onItemsRemoved = (
  inventoryItems:Array<InventoryItemWithStat>,
  inventoryItemStats:InventoryItemStats
):InventoryItemStats => {

  const currencyCode = inventoryItemStats.totalValueOfInventoryItems.currencyCode
  let individualItemsToRemove = 0
  let individualItemsWithAmountPaidToRemove = 0
  let valueOfInventoryItemsToRemove = Zero(currencyCode)
  let profitFromAmountPaidToRemove = Zero(currencyCode)
  let valueFromAmountPaidToRemove = Zero(currencyCode)

  inventoryItems.forEach(item => {
    const inventoryItem = item.inventoryItem

    individualItemsToRemove++;
    if (inventoryItem.amountPaid) {
      individualItemsWithAmountPaidToRemove++
    }
    const optionalInventoryItemPrice = calculateInventoryItemPrice(item, currencyCode);
    if (!optionalInventoryItemPrice) {
      return
    }
    const inventoryItemPrice = fromCurrencyAmountLike(optionalInventoryItemPrice.price)
    valueOfInventoryItemsToRemove = valueOfInventoryItemsToRemove.add(inventoryItemPrice)
    if (!inventoryItem.amountPaid) {
      return
    }
    const amountPaid = fromCurrencyAmountLike(inventoryItem.amountPaid)
    valueFromAmountPaidToRemove = valueFromAmountPaidToRemove.add(amountPaid)
    const profit = inventoryItemPrice.subtract(amountPaid)
    profitFromAmountPaidToRemove = profitFromAmountPaidToRemove.add(profit);
  })

  const inventoryItemIdsToRemove = toSet(inventoryItems, input => input.inventoryItem.id)
  const topInventoryItems:Array<TopInventoryItem> = inventoryItemStats.topInventoryItems.slice()
    .filter(item => !inventoryItemIdsToRemove.has(item.inventoryItemId))

  const totalNumberOfIndividualItems = Math.max(
    inventoryItemStats.totalNumberOfIndividualItems - individualItemsToRemove,
    0
  )
  const totalNumberOfIndividualItemsWithAmountPaid = Math.max(
    inventoryItemStats.totalNumberOfIndividualItemsWithAmountPaid - individualItemsWithAmountPaidToRemove,
    0
  )
  const newTotalValueOfInventoryItems = fromCurrencyAmountLike(inventoryItemStats.totalValueOfInventoryItems).subtract(valueOfInventoryItemsToRemove)
  const totalValueOfInventoryItems = newTotalValueOfInventoryItems.isPositive()
    ? newTotalValueOfInventoryItems
    : Zero(currencyCode)
  const newTotalProfitFromAmountPaid = fromCurrencyAmountLike(inventoryItemStats.totalProfitFromAmountPaid).subtract(profitFromAmountPaidToRemove)
  const totalProfitFromAmountPaid = newTotalProfitFromAmountPaid.isPositive()
    ? newTotalProfitFromAmountPaid
    : Zero(currencyCode)
  const newTotalAmountPaid = fromCurrencyAmountLike(inventoryItemStats.totalAmountPaid).subtract(valueFromAmountPaidToRemove)
  const totalAmountPaid = newTotalAmountPaid.isPositive()
    ? newTotalAmountPaid
    : Zero(currencyCode)

  return {
    totalNumberOfIndividualItems,
    totalNumberOfIndividualItemsWithAmountPaid,
    totalValueOfInventoryItems: totalValueOfInventoryItems.toCurrencyAmountLike(),
    totalProfitFromAmountPaid: totalProfitFromAmountPaid.toCurrencyAmountLike(),
    totalAmountPaid: totalAmountPaid.toCurrencyAmountLike(),
    topInventoryItems,
    topInventoryItemIds: topInventoryItems.map(item => item.inventoryItemId),
  }
}

const groupInventoryItemStats = () => {
  // want to add some new calcultated stats to portfolio stats
  // need to make sure they are updated on item / inv. item added / removed
  // take the inventory items, group them into the groups you want
  // then for each group, calculate the stats
  // going to group by things like series / set / pokemon / rarity
  // can then provide a breakdown like number of cards owned in each rarity / pokemon etc.
}

const calculate = (
  context:StatCalculationContext,
):InventoryItemStats => {

  const currencyCode = context.getUserCurrencyCode()
  const items:Array<InventoryItemWithStat> = context.getAllInventoryItemsWithStats()

  return onItemsAdded(
    items,
    {
      totalNumberOfIndividualItems: 0,
      totalNumberOfIndividualItemsWithAmountPaid: 0,
      totalValueOfInventoryItems: Zero(currencyCode),
      totalProfitFromAmountPaid: Zero(currencyCode),
      totalAmountPaid: Zero(currencyCode),
      topInventoryItems: [],
      topInventoryItemIds: [],
    }
  )
}

const addItemStatsToInventoryItems = async (currencyCode:CurrencyCode, inventoryItems:Array<InventoryItemEntity>):Promise<Array<InventoryItemWithStat>> => {
  const groupedInventoryItems = toInputValueMultiMap(inventoryItems, input => input.itemType)
  const items = flattenArray(await Promise.all(
    [...groupedInventoryItems.entries()].map(entry => {
      const itemType = entry[0];
      const invItems = entry[1]
      const itemIds = dedupe(invItems.map(i => i.itemId), value => value)
      return statRetriever.retrieveMany(itemIds, currencyCode)
    })
  ))
  const itemIdToItem = toInputValueMap(items, input => input.itemId)
  const itemsWithStats:Array<InventoryItemWithStat> = []
  inventoryItems.forEach(inventoryItem => {
    const item = itemIdToItem.get(inventoryItem.itemId)
    if (!item) {
      return
    }
    itemsWithStats.push({
      inventoryItem,
      item,
    })
  })
  return itemsWithStats
}

const onInventoryItemsAdded = async (
  inventoryItems:Array<InventoryItemEntity>,
  inventoryItemStats:InventoryItemStats
):Promise<InventoryItemStats> => {
  const currencyCode = inventoryItemStats.totalValueOfInventoryItems.currencyCode
  const itemsWithStats = await addItemStatsToInventoryItems(currencyCode, inventoryItems)
  return onItemsAdded(
    itemsWithStats,
    inventoryItemStats
  )
}

const onInventoryItemsRemoved = async (
  inventoryItems:Array<InventoryItemEntity>,
  inventoryItemStats:InventoryItemStats
):Promise<InventoryItemStats> => {
  const currencyCode = inventoryItemStats.totalValueOfInventoryItems.currencyCode
  const itemsWithStats = await addItemStatsToInventoryItems(currencyCode, inventoryItems)
  return onItemsRemoved(
    itemsWithStats,
    inventoryItemStats
  )
}

export const inventoryItemStatsCalculator = {
  calculate,
  onItemsAdded,
  onItemsRemoved,
  onInventoryItemsAdded,
  onInventoryItemsRemoved,
}