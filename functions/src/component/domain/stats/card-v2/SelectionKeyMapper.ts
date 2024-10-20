import {PriceType} from "./CardPriceSelectionEntity";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {CardCondition} from "../../historical-card-price/CardCondition";
import {Price} from "./StatsPriceRetriever";


export interface SelectionKey {
  key:string,
  cardId:string,
  priceType:PriceType,
  currencyCode:CurrencyCode,
  condition:CardCondition,
}

const toKey = (cardId:string, priceType:PriceType, condition:CardCondition, currencyCode:CurrencyCode) => {
  return `${cardId}|${priceType}|${condition}|${currencyCode}`
}

const toSelectionKey = (cardId:string, priceType:PriceType, condition:CardCondition, currencyCode:CurrencyCode) => {
  return {
    cardId,
    priceType,
    condition,
    currencyCode,
    key: toKey(cardId, priceType, condition, currencyCode),
  }
}

const mapPriceToSelectionKey = (price:Price):SelectionKey|null => {
  if (price.listing) {
    const listing = price.listing
    return toSelectionKey(listing.cardId, PriceType.LISTING_PRICE, listing.condition, listing.mostRecentPrice.currencyCode)
  }
  if (price.soldPrice) {
    const soldPrice = price.soldPrice
    return toSelectionKey(soldPrice.cardId, PriceType.SOLD_PRICE, soldPrice.condition, soldPrice.currencyAmount.currencyCode)
  }
  return null
}

const mapPricesToSelectionKeys = (prices:Array<Price>):Map<string, SelectionKey> => {
  const keyToSelectionKey = new Map<string, SelectionKey>()
  prices.map(mapPriceToSelectionKey).forEach(key => {
    if (!key) {
      return
    }
    keyToSelectionKey.set(key.key, key)
  })
  return keyToSelectionKey
}

export const selectionKeyMapper = {
  mapPricesToSelectionKeys,
  mapPriceToSelectionKey,
  toKey,
  toSelectionKey,
}