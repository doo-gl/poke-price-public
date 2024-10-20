import {extractUserCurrencyCode, UserEntity} from "../user/UserEntity";
import {CurrencyAmountLike} from "../money/CurrencyAmount";
import {inventoryItemMapper, PublicInventoryItemDto} from "./InventoryItemMapper";
import {inventoryItemRetriever} from "./InventoryItemRetriever";
import {NotAuthorizedError} from "../../error/NotAuthorizedError";
import {baseInventoryItemUpdater, InventoryItemEntity} from "./InventoryItemEntity";
import {Update} from "../../database/Entity";
import {ItemType} from "../item/ItemEntity";
import {inventoryItemPokePriceRetriever} from "./InventoryItemPokePriceRetriever";
import {itemRetriever} from "../item/ItemRetriever";
import {TimestampStatic} from "../../external-lib/Firebase";
import moment from "moment";
import {currencyExchanger} from "../money/CurrencyExchanger";
import {toInputValueMap} from "../../tools/MapBuilder";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../marketplace/item-details/SinglePokemonCardItemDetails";
import {portfolioStatsRecalculator} from "../portfolio/PortfolioStatsRecalculator";

export interface InventoryItemUpdateRequest {
  amountPaid?:CurrencyAmountLike|null,
  userPokePrice?:CurrencyAmountLike|null,
  note?:string|null,
  itemDetails?:any,
  datePurchased?:string|null,
}

const calculateItemDetailUpdate = (inventoryItem:InventoryItemEntity, requestItemDetails:any):any => {
  if (inventoryItem.itemType !== ItemType.SINGLE_CARD && inventoryItem.itemType !== SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return {}
  }
  const newItemDetails = {
    ...inventoryItem.itemDetails,
  }
  if (requestItemDetails.condition) {
    newItemDetails.condition = requestItemDetails.condition
  }
  if (
    requestItemDetails.grade
    && requestItemDetails.grade.graderName
    && requestItemDetails.grade.graderKey
    && requestItemDetails.grade.grade
  ) {
    newItemDetails.grade = requestItemDetails.grade
  }

  if (requestItemDetails.grade === null && newItemDetails.grade) {
    newItemDetails.grade = null
  }

  return newItemDetails
}

const calculateUpdate = (inventoryItem:InventoryItemEntity, request:InventoryItemUpdateRequest):Update<InventoryItemEntity> => {
  const itemUpdate:Update<InventoryItemEntity> = {}

  if (request.amountPaid !== undefined) {
    if (request.amountPaid !== null) {
      itemUpdate.amountPaid = {
        amountInMinorUnits: Math.round(request.amountPaid.amountInMinorUnits),
        currencyCode: request.amountPaid.currencyCode,
      }
    } else {
      itemUpdate.amountPaid = null
    }
  }

  if (request.userPokePrice !== undefined) {
    if (request.userPokePrice !== null) {
      itemUpdate.dateUserPokePriceSet = TimestampStatic.now()
      itemUpdate.userPokePrice = {
        amountInMinorUnits: Math.round(request.userPokePrice.amountInMinorUnits),
        currencyCode: request.userPokePrice.currencyCode,
      }
    } else {
      itemUpdate.dateUserPokePriceSet = null
      itemUpdate.userPokePrice = null
    }
  }

  if (request.note && request.note.length <= 500) {
    itemUpdate.note = request.note
  }

  if (request.datePurchased && request.datePurchased.length > 0) {
    itemUpdate.datePurchased = TimestampStatic.fromDate(moment(request.datePurchased).toDate())
  }
  if (request.datePurchased === null || request.datePurchased?.length === 0) {
    itemUpdate.datePurchased = null
  }

  if (request.itemDetails) {
    itemUpdate.itemDetails = calculateItemDetailUpdate(inventoryItem, request.itemDetails)
  }

  return itemUpdate;
}

const update = async (id:string, user:UserEntity, request:InventoryItemUpdateRequest):Promise<PublicInventoryItemDto> => {
  const inventoryItem = await inventoryItemRetriever.retrieve(id)
  if (inventoryItem.userId !== user.id) {
    throw new NotAuthorizedError(`User not allowed to update this inventory item`)
  }
  const item = await itemRetriever.retrieveByIdOrLegacyId(inventoryItem.itemId)
  const updatedInventoryItem = await baseInventoryItemUpdater.updateAndReturn(
    inventoryItem.id,
    calculateUpdate(inventoryItem, request)
  )

  await portfolioStatsRecalculator.onInventoryItemsRemovedV2([inventoryItem], [])
  await portfolioStatsRecalculator.onInventoryItemsAddedV2([updatedInventoryItem], [])

  const userCurrencyCode = extractUserCurrencyCode(user)
  const exchangeRates = await currencyExchanger.getExchangeRates(userCurrencyCode)
  const fromCurrencyToExchangeRate = toInputValueMap(exchangeRates, val => val.fromCurrency)

  return inventoryItemMapper.mapPublic(
    item,
    updatedInventoryItem,
    fromCurrencyToExchangeRate,
  )
}

export const inventoryItemUpdater = {
  update,
}