import {
  ItemPriceHistory,
  ItemPriceHistoryEntity,
  ItemPriceHistoryPoint,
  ItemPriceHistoryState,
} from "./ItemPriceHistoryEntity";
import {itemRetriever} from "../ItemRetriever";
import {itemPriceHistoryRetriever} from "./ItemPriceHistoryRetriever";
import {timestampToString} from "../../../tools/TimeConverter";
import {CurrencyCode} from "../../money/CurrencyCodes";

export interface PublicItemPriceHistoryPoint {
  timestamp:string,
  low:number|null,
  price:number|null,
  high:number|null,
  volume:number|null,
}

export interface PublicItemPriceHistory {
  currencyCode:CurrencyCode,
  prices:Array<PublicItemPriceHistoryPoint>,
}

export interface PublicItemPriceHistoryDto {
  id:string,
  itemId:string,
  lastBackfilled:string|null,
  startedBackfillAt:string|null,
  state:ItemPriceHistoryState,

  fourteenDayGbpEbaySales:PublicItemPriceHistory,
  fourteenDayUsdEbaySales:PublicItemPriceHistory,
  ninetyDayGbpEbaySales:PublicItemPriceHistory,
  ninetyDayUsdEbaySales:PublicItemPriceHistory,
  tcgPlayerGbp:PublicItemPriceHistory,
  tcgPlayerUsd:PublicItemPriceHistory,
  cardmarketGbp:PublicItemPriceHistory,
  cardmarketUsd:PublicItemPriceHistory,
}

export interface PublicItemPriceHistoryResponse {
  history:PublicItemPriceHistoryDto|null
}

const mapHistoryPoint = (point:ItemPriceHistoryPoint):PublicItemPriceHistoryPoint => {
  return {
    timestamp: timestampToString(point.timestamp),
    low: point.low,
    price: point.price,
    high: point.high,
    volume: point.volume,
  }
}

const mapPriceHistory = (history:ItemPriceHistory):PublicItemPriceHistory => {
  return {
    currencyCode: history.currencyCode,
    prices: history.prices.map(prc => mapHistoryPoint(prc)),
  }
}

const mapPriceHistoryEntity = (entity:ItemPriceHistoryEntity):PublicItemPriceHistoryDto => {
  return {
    id: entity.id,
    itemId: entity.itemId,
    state: entity.state,
    lastBackfilled: entity.lastBackfilled ? timestampToString(entity.lastBackfilled) : null,
    startedBackfillAt: entity.startedBackfillAt ? timestampToString(entity.startedBackfillAt) : null,
    fourteenDayGbpEbaySales: mapPriceHistory(entity.fourteenDayGbpEbaySales),
    fourteenDayUsdEbaySales: mapPriceHistory(entity.fourteenDayUsdEbaySales),
    ninetyDayGbpEbaySales: mapPriceHistory(entity.ninetyDayGbpEbaySales),
    ninetyDayUsdEbaySales: mapPriceHistory(entity.ninetyDayUsdEbaySales),
    tcgPlayerGbp: mapPriceHistory(entity.tcgPlayerGbp),
    tcgPlayerUsd: mapPriceHistory(entity.tcgPlayerUsd),
    cardmarketGbp: mapPriceHistory(entity.cardmarketGbp),
    cardmarketUsd: mapPriceHistory(entity.cardmarketUsd),
  }
}

const retrieve = async (itemIdOrSlug:string):Promise<PublicItemPriceHistoryResponse> => {
  const item = await itemRetriever.retrieveByIdOrLegacyIdOrSlug(itemIdOrSlug)
  const itemPriceHistory = await itemPriceHistoryRetriever.retrieveForItem(item._id.toString())

  return itemPriceHistory
    ? { history: mapPriceHistoryEntity(itemPriceHistory) }
    : { history: null }
}

export const publicItemPriceHistoryRetriever = {
  retrieve,
}