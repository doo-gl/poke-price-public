import {InventoryItemEntity} from "./InventoryItemEntity";
import {CurrencyAmountLike} from "../money/CurrencyAmount";
import {Images, ItemEntity, ItemType} from "../item/ItemEntity";
import {CardCondition, notNearMint} from "../historical-card-price/CardCondition";
import {toGradingDetails} from "../modification/ItemModification";
import {buildModificationKey} from "../modification/GradingIdentifier";
import {itemPriceQuerier} from "../item/ItemPriceQuerier";
import {UserEntity} from "../user/UserEntity";
import {currencyExchanger, ExchangeRate} from "../money/CurrencyExchanger";
import {userContext} from "../../infrastructure/UserContext";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {CurrencyCode} from "../money/CurrencyCodes";
import {toInputValueMap} from "../../tools/MapBuilder";
import {conditionalPokePriceConverter} from "../stats/card-v2/ConditionalPokePriceConverter";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../marketplace/item-details/SinglePokemonCardItemDetails";


export interface PublicInventoryItemDto {
  inventoryItemId:string,
  dateCreated:string,
  userId:string,
  itemId:string,
  legacyItemId:string|null,
  itemType:string,
  itemDetails:any,
  amountPaid:CurrencyAmountLike|null,
  pokePrice:CurrencyAmountLike|null,
  userPokePrice:CurrencyAmountLike|null,
  images:Images|null,
  datePurchased:string|null,
  note:string|null,
}

export interface PublicSingleCardInventoryItemDetails {
  condition:CardCondition
}

const mapPublicDetails = (itemType:string, itemDetails:any):any => {
  if (!itemDetails) {
    return {}
  }
  if (itemType === ItemType.SINGLE_CARD || itemType === SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return {
      condition: itemDetails.condition,
      grade: itemDetails.grade,
    }
  }

  return {}
}

const mapInventoryItemPrice = (item:ItemEntity, inventoryItem:InventoryItemEntity, preferredCurrency?:CurrencyCode):CurrencyAmountLike|null => {

  const itemDetails = inventoryItem.itemDetails
  const gradingDetails = toGradingDetails(itemDetails.grade)
  if (gradingDetails) {
    const modificationKey = buildModificationKey(gradingDetails.graderKey, gradingDetails.grade)
    return itemPriceQuerier.modificationPrice(item, modificationKey)
  }
  const condition = itemDetails.condition
  const pokePrice = itemPriceQuerier.pokePrice(item, preferredCurrency)
  if (!pokePrice?.price) {
    return null
  }
  if (notNearMint(condition)) {
    return conditionalPokePriceConverter.convert(pokePrice.price, condition)
  }
  return pokePrice.price
}

const mapPublic = (item:ItemEntity, inventoryItem:InventoryItemEntity, fromCurrencyToExchangeRate:Map<CurrencyCode, ExchangeRate>):PublicInventoryItemDto => {

  const userCurrencyCode = userContext.getUser()?.preferredCurrency
  const unconvertedPrice = mapInventoryItemPrice(item, inventoryItem, userCurrencyCode)
  let pokePrice:CurrencyAmountLike|null = null
  const exchangeRate = userCurrencyCode
    ? fromCurrencyToExchangeRate.get(userCurrencyCode)
    : null
  if (unconvertedPrice && exchangeRate) {
    pokePrice = currencyExchanger.convert(unconvertedPrice, exchangeRate.toCurrency, exchangeRate.rate)
  }

  return {
    inventoryItemId: inventoryItem.id,
    dateCreated: inventoryItem.dateCreated.toDate().toISOString(),
    itemId: item._id.toString(),
    legacyItemId: item.legacyId ?? null,
    userId: inventoryItem.userId,
    itemType: inventoryItem.itemType,
    itemDetails: mapPublicDetails(inventoryItem.itemType, inventoryItem.itemDetails),
    amountPaid: inventoryItem.amountPaid,
    pokePrice,
    userPokePrice: inventoryItem.userPokePrice ?? null,
    images: inventoryItem.images,
    note: inventoryItem.note ?? null,
    datePurchased: inventoryItem.datePurchased?.toDate().toISOString() ?? null,
  }
}

const mapPublicList = async (item:ItemEntity, inventoryItems:Array<InventoryItemEntity>):Promise<Array<PublicInventoryItemDto>> => {
  const user = userContext.getUser()
  if (!user) {
    throw new InvalidArgumentError(`Cannot get inventory without a user`)
  }
  const userCurrencyCode = user?.preferredCurrency ?? CurrencyCode.GBP
  const exchangeRates = await currencyExchanger.getExchangeRates(userCurrencyCode)
  const fromCurrencyToExchangeRate = toInputValueMap(exchangeRates, val => val.fromCurrency)
  return inventoryItems.map(
    inventoryItem => mapPublic(item, inventoryItem, fromCurrencyToExchangeRate)
  )
}

export const inventoryItemMapper = {
  mapPublic,
  mapPublicList,
}