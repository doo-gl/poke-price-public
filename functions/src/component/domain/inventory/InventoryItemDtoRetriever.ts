import {extractUserCurrencyCode, UserEntity} from "../user/UserEntity";
import {ApiList} from "../PagingResults";
import {inventoryItemMapper, PublicInventoryItemDto} from "./InventoryItemMapper";
import {inventoryItemRetriever} from "./InventoryItemRetriever";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {InventoryItemEntity} from "./InventoryItemEntity";
import {ItemEntity, itemIdsWithLegacyIds, ItemType, legacyIdOrFallback} from "../item/ItemEntity";
import {mapConditionToPriority} from "../historical-card-price/CardCondition";
import {toInputValueSet, toSet} from "../../tools/SetBuilder";
import {toInputValueMap} from "../../tools/MapBuilder";
import {inventoryItemPokePriceRetriever} from "./InventoryItemPokePriceRetriever";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {itemRetriever} from "../item/ItemRetriever";
import {dedupe} from "../../tools/ArrayDeduper";
import {removeNulls} from "../../tools/ArrayNullRemover";
import {currencyExchanger} from "../money/CurrencyExchanger";

const BY_ITEM_ID_THEN_CONDITION_THEN_DATE_CREATED_DESC = comparatorBuilder.combineAll<InventoryItemEntity>(
  comparatorBuilder.objectAttributeASC<InventoryItemEntity, string>(value => value.itemId),
  comparatorBuilder.objectAttributeASC<InventoryItemEntity, number>(value => {
    return value.itemType === ItemType.SINGLE_CARD && !!value.itemDetails?.condition
      ? mapConditionToPriority(value.itemDetails.condition)
      : 0
  }),
  comparatorBuilder.objectAttributeASC<InventoryItemEntity, number>(value => {
    return value.amountPaid
      ? value.amountPaid.amountInMinorUnits
      : 0
  }),
  comparatorBuilder.objectAttributeDESC<InventoryItemEntity, number>(value => value.dateCreated.toDate().getTime()),
)

export interface GetManyInventoryItemRequest {
  itemIds:Array<string>,
}

const retrieveMany = async (user:UserEntity, request:GetManyInventoryItemRequest):Promise<ApiList<PublicInventoryItemDto>> => {
  const requestItemIds = request.itemIds;
  const items = await itemRetriever.retrieveManyByIdOrLegacyId(requestItemIds)
  const allItemIds = itemIdsWithLegacyIds(items)
  const inventoryItems = await inventoryItemRetriever.retrieveByItemIdsAndUserId(allItemIds, user.id)
  const uniqueInventoryItems = dedupe(inventoryItems, i => i.id)

  const itemIdToItem = new Map<string, ItemEntity>()
  items.forEach(item => {
    const itemId = item._id.toString()
    const legacyId = item.legacyId
    itemIdToItem.set(itemId, item)
    if (legacyId) {
      itemIdToItem.set(legacyId, item)
    }
  })
  const userCurrencyCode = extractUserCurrencyCode(user)
  const exchangeRates = await currencyExchanger.getExchangeRates(userCurrencyCode)
  const fromCurrencyToExchangeRate = toInputValueMap(exchangeRates, val => val.fromCurrency)

  const results = await Promise.all(
    uniqueInventoryItems
      .sort(BY_ITEM_ID_THEN_CONDITION_THEN_DATE_CREATED_DESC)
      .map(async inventoryItem => {
        const item = itemIdToItem.get(inventoryItem.itemId) ?? null
        if (!item) {
          return null;
        }
        return inventoryItemMapper.mapPublic(
          item,
          inventoryItem,
          fromCurrencyToExchangeRate,
        )
      }),
  )

  return {
    results: removeNulls(results),
    fromId: null,
  }
}


export const inventoryItemDtoRetriever = {
  retrieveMany,
}