import {CurrencyAmountLike} from "../money/CurrencyAmount";
import {Images, itemOrLegacyIdToItem, ItemType, legacyIdOrFallback} from "../item/ItemEntity";
import {inventoryItemDetailsValidator} from "./InventoryItemDetailsValidator";
import {UserEntity} from "../user/UserEntity";
import {itemExistsValidator} from "../item/ItemExistsValidator";
import {InventoryItemEntity, inventoryItemRepository} from "./InventoryItemEntity";
import {CardOwnershipEntity, OwnershipType} from "../card-ownership/CardOwnershipEntity";
import {Create} from "../../database/Entity";
import {CardCondition} from "../historical-card-price/CardCondition";
import {inventoryItemRetriever} from "./InventoryItemRetriever";
import {toInputValueMap, toInputValueMultiMap} from "../../tools/MapBuilder";
import {BatchUpdate} from "../../database/BaseCrudRepository";
import {cardOwnershipRepository} from "../card-ownership/CardOwnershipRepository";
import {dedupe} from "../../tools/ArrayDeduper";
import {userMembershipQuerier} from "../membership/UserMembershipQuerier";
import {cardOwnershipRetriever} from "../card-ownership/CardOwnershipRetriever";
import {toSet} from "../../tools/SetBuilder";
import {cardOwnershipMarker} from "../card-ownership/CardOwnershipMarker";
import {mailchimpEventHandler} from "../mailchimp/MailchimpEventHandler";
import {itemRetriever} from "../item/ItemRetriever";
import {portfolioStatsRecalculator} from "../portfolio/PortfolioStatsRecalculator";
import {inventoryItemMapper, PublicInventoryItemDto} from "./InventoryItemMapper";
import {removeNulls} from "../../tools/ArrayNullRemover";
import moment from "moment";
import {TimestampStatic} from "../../external-lib/Firebase";
import {currencyExchanger} from "../money/CurrencyExchanger";
import {CurrencyCode} from "../money/CurrencyCodes";
import {cardCollectionOwnershipSyncer} from "../card-collection/CardCollectionOwnershipSyncer";

export interface InventoryItemCreateManyRequest {
  inventoryItems:Array<InventoryItemCreateRequest>
  syncCollections?:Array<string>,
}

export interface InventoryItemCreateRequest {
  itemId:string,
  itemType:string,
  itemDetails:any,
  amountPaid:CurrencyAmountLike|null,
  userPokePrice:CurrencyAmountLike|null,
  images:Images|null,
  note:string|null,
  datePurchased:string|null,
}

const filterOutItems = async (user:UserEntity, request:InventoryItemCreateManyRequest, itemIdToOwnership:Map<string, CardOwnershipEntity>):Promise<Array<InventoryItemCreateRequest>> => {
  // pro users can create unlimited inventory items for each item
  if (userMembershipQuerier.isPokePriceProUser(user)) {
    return request.inventoryItems
  }

  // non-pro users can create at most one inventory item for each item
  // if they try to create more than one, filter the request out
  const inventoryItemsToCreate = request.inventoryItems.filter(inventoryItem => {
    const ownership = itemIdToOwnership.get(inventoryItem.itemId)
    return !ownership || ownership.inventoryItemIds.length === 0
  })
  return inventoryItemsToCreate
}

const validateItemsExist = async (inventoryItems:Array<InventoryItemCreateRequest>):Promise<void> => {
  const itemIds = dedupe(inventoryItems.map(item => item.itemId), i => i)
  await itemExistsValidator.validate(itemIds)
}

const upsertOwnerships = async (user:UserEntity, itemIds:Array<string>):Promise<{creates:Array<CardOwnershipEntity>}> => {
  const inventoryItems = await inventoryItemRetriever.retrieveByItemIdsAndUserId(itemIds, user.id)
  const preExistingOwnerships = await cardOwnershipRetriever.retrieveCardsOwnedByUser(itemIds, user.id)

  const itemIdToInventoryItems = toInputValueMultiMap(inventoryItems, i => i.itemId)
  const itemIdToOwnership = toInputValueMap(preExistingOwnerships, i => i.cardId)

  const creates:Array<Create<CardOwnershipEntity>> = []
  const updates:Array<BatchUpdate<CardOwnershipEntity>> = []

  itemIds.forEach(itemId => {
    const ownership = itemIdToOwnership.get(itemId)
    const inventoryForItem = itemIdToInventoryItems.get(itemId)
    const inventoryItemIds = (inventoryForItem ?? [])
      .map(inventoryItem => inventoryItem.id)
      .sort()
    if (!ownership) {
      creates.push({
        userId: user.id,
        cardId: itemId,
        ownershipType: OwnershipType.OWNED,
        inventoryItemIds,
      })
    } else {
      updates.push({
        id: ownership.id,
        update: {
          inventoryItemIds,
        },
      })
    }
  })

  const result:any = await Promise.all([
    cardOwnershipRepository.batchCreateAndReturn(creates),
    cardOwnershipRepository.batchUpdate(updates),
  ])
  const createdOwnershipIds:Array<string> = result[0].ids
  const createdOwnerships = await cardOwnershipRetriever.retrieveByIds(createdOwnershipIds)

  return {creates:createdOwnerships}
}

const create = async (user:UserEntity, request:InventoryItemCreateManyRequest):Promise<Array<PublicInventoryItemDto>> => {
  // need to start by mapping the request item ids from either being mongo or legacy
  // to being legacy first then falling back to mongo
  const requestItemIds = dedupe(request.inventoryItems.map(inventoryItem => inventoryItem.itemId), i => i)
  const items = await itemRetriever.retrieveManyByIdOrLegacyId(requestItemIds)
  const itemIdToItem = itemOrLegacyIdToItem(items)
  const mappedRequest:InventoryItemCreateManyRequest = {
    inventoryItems: request.inventoryItems.map(inventoryItem => {
      const item = itemIdToItem.get(inventoryItem.itemId)
      if (!item) {
        return inventoryItem
      }
      return {
        ...inventoryItem,
        itemId: legacyIdOrFallback(item),
      }
    }),
  }

  const itemIds = dedupe(mappedRequest.inventoryItems.map(inventoryItem => inventoryItem.itemId), i => i)
  const preExistingOwnerships = await cardOwnershipRetriever.retrieveCardsOwnedByUser(itemIds, user.id)
  const itemIdToOwnership = toInputValueMap(preExistingOwnerships, i => i.cardId)

  const inventoryItemsToCreate = await filterOutItems(user, mappedRequest, itemIdToOwnership)
  await validateItemsExist(inventoryItemsToCreate)

  const isFirstInventoryItem = (await inventoryItemRetriever.retrieveByUserId(user.id, 1)).length === 0
  if (isFirstInventoryItem) {
    await mailchimpEventHandler.onFirstInventoryItemAdded(user)
  }

  const inventoryItemCreates:Array<Create<InventoryItemEntity>> = [];
  inventoryItemsToCreate.forEach(inventoryItem => {
    inventoryItemDetailsValidator.validate(inventoryItem.itemType, inventoryItem.itemDetails)
    inventoryItemCreates.push({
      userId: user.id,
      itemId: inventoryItem.itemId,
      itemType: inventoryItem.itemType,
      itemDetails: inventoryItem.itemDetails,
      images: inventoryItem.images,
      amountPaid: inventoryItem.amountPaid
        ? (
          {
            amountInMinorUnits: Math.round(inventoryItem.amountPaid.amountInMinorUnits),
            currencyCode: inventoryItem.amountPaid.currencyCode,
          }
        )
        : null,
      userPokePrice: inventoryItem.userPokePrice
        ? (
          {
            amountInMinorUnits: Math.round(inventoryItem.userPokePrice.amountInMinorUnits),
            currencyCode: inventoryItem.userPokePrice.currencyCode,
          }
        )
        : null,
      dateUserPokePriceSet: inventoryItem.userPokePrice ? TimestampStatic.now() : null,
      note: inventoryItem.note,
      datePurchased: inventoryItem.datePurchased
        ? TimestampStatic.fromDate(moment(inventoryItem.datePurchased).toDate())
        : null,
    })
  })
  const itemIdsThatHaveInventory = [...toSet(inventoryItemsToCreate, i => i.itemId)]
  const createdIds = await inventoryItemRepository.batchCreateAndReturn(inventoryItemCreates)
  const newInventoryItems = await inventoryItemRetriever.retrieveByIds(createdIds.ids)

  const ownershipUpsertResult = await upsertOwnerships(user, itemIdsThatHaveInventory)
  await cardOwnershipMarker.markCollectionsAsOwned(user.id, itemIdsThatHaveInventory)
  await portfolioStatsRecalculator.onInventoryItemsAddedV2(newInventoryItems, ownershipUpsertResult.creates)

  const preferredCurrency = user.preferredCurrency ?? CurrencyCode.GBP
  const exchangeRates = await currencyExchanger.getExchangeRates(preferredCurrency)
  const fromCurrencyToExchangeRate = toInputValueMap(exchangeRates, val => val.fromCurrency)


  if (request.syncCollections) {
    await cardCollectionOwnershipSyncer.syncAll(user.id, request.syncCollections)
  }

  return removeNulls(newInventoryItems.map(inventoryItem => {
    const item = itemIdToItem.get(inventoryItem.itemId)
    if (!item || !user) {
      return null
    }

    return inventoryItemMapper.mapPublic(
      item,
      inventoryItem,
      fromCurrencyToExchangeRate
    )
  }))
}

const createFromOwnerships = async (user:UserEntity, ownerships:Array<CardOwnershipEntity>):Promise<Array<InventoryItemEntity>> => {
  const userId = user.id
  const itemIds = ownerships.map(ownership => ownership.cardId)
  const inventoryCreates:Array<Create<InventoryItemEntity>> = []
  itemIds.forEach(itemId => {
    inventoryCreates.push({
      userId: userId,
      itemId: itemId,
      itemType: ItemType.SINGLE_CARD,
      itemDetails: {
        condition: CardCondition.NEAR_MINT,
      },
      amountPaid: null,
      images: null,
    })
  })
  const createdIds = await inventoryItemRepository.batchCreateAndReturn(inventoryCreates)
  const newInventoryItems = await inventoryItemRetriever.retrieveByIds(createdIds.ids)

  const inventoryItems = await inventoryItemRetriever.retrieveByItemIdsAndUserId(itemIds, user.id)
  const itemIdToItems = toInputValueMultiMap(inventoryItems, i => i.itemId)
  const updates:Array<BatchUpdate<CardOwnershipEntity>> = []
  ownerships.forEach(ownership => {
    const inventory = itemIdToItems.get(ownership.cardId) ?? []
    const inventoryItemIds = inventory.map(inventoryItem => inventoryItem.id)
    updates.push({
      id: ownership.id,
      update: {
        inventoryItemIds,
      },
    })
  })
  await cardOwnershipRepository.batchUpdate(updates)

  return newInventoryItems
}

export const inventoryItemCreator = {
  create,
  createFromOwnerships,
}