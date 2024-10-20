import {InventoryItemEntity} from "./InventoryItemEntity";
import {CurrencyAmountLike} from "../money/CurrencyAmount";
import {currencyExchanger} from "../money/CurrencyExchanger";
import moment from "moment/moment";
import {conditionalPokePriceConverter} from "../stats/card-v2/ConditionalPokePriceConverter";
import {ItemEntity} from "../item/ItemEntity";
import {itemPriceQuerier} from "../item/ItemPriceQuerier";
import {extractUserCurrencyCode, UserEntity} from "../user/UserEntity";
import {CardCondition} from "../historical-card-price/CardCondition";

const retrieveSoldPriceInAmountPaidCurrency = async (soldPrice:CurrencyAmountLike, amountPaid:CurrencyAmountLike):Promise<CurrencyAmountLike> => {
  if (soldPrice.currencyCode === amountPaid.currencyCode) {
    return soldPrice
  }
  return currencyExchanger.exchange(soldPrice, amountPaid.currencyCode, moment().subtract(1, 'day'))
}

const retrieve = async (user:UserEntity, inventoryItem:InventoryItemEntity, item:ItemEntity|null):Promise<CurrencyAmountLike|null> => {
  const userCurrencyCode = extractUserCurrencyCode(user)
  const itemPrice = itemPriceQuerier.pokePrice(item, userCurrencyCode)?.price ?? null
  if (!item || !itemPrice) {
    return null
  }

  if (!inventoryItem.amountPaid) {
    return itemPrice
  }
  const amountPaid = inventoryItem.amountPaid
  const soldPriceInAmountPaidCurrency = await retrieveSoldPriceInAmountPaidCurrency(itemPrice, amountPaid)

  const pokePrice = conditionalPokePriceConverter.convert(soldPriceInAmountPaidCurrency, inventoryItem.itemDetails?.condition ?? CardCondition.NEAR_MINT)
  return pokePrice
}

export const inventoryItemPokePriceRetriever = {
  retrieve,
}