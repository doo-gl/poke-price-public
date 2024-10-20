import {Entity} from "../../../database/Entity";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {Timestamp} from "../../../external-lib/Firebase";
import {repositoryFactory} from "../../../database/RepositoryFactory";

const COLLECTION_NAME = 'item-price-history'

export enum ItemPriceHistoryState {
  NOT_CALCULATED = 'NOT_CALCULATED',
  CALCULATING = 'CALCULATING',
  CALCULATED = 'CALCULATED',
}

export interface ItemPriceHistoryPoint {
  timestamp:Timestamp,
  low:number|null,
  price:number|null,
  high:number|null,
  volume:number|null,
}

export interface ItemPriceHistory {
  currencyCode:CurrencyCode,
  prices:Array<ItemPriceHistoryPoint>,
}

export interface ItemPriceHistoryContainer {
  fourteenDayGbpEbaySales:ItemPriceHistory,
  fourteenDayUsdEbaySales:ItemPriceHistory,
  ninetyDayGbpEbaySales:ItemPriceHistory,
  ninetyDayUsdEbaySales:ItemPriceHistory,
  tcgPlayerGbp:ItemPriceHistory,
  tcgPlayerUsd:ItemPriceHistory,
  cardmarketGbp:ItemPriceHistory,
  cardmarketUsd:ItemPriceHistory,
}

export interface ItemPriceHistoryEntity extends Entity, ItemPriceHistoryContainer {
  itemId:string,
  lastBackfilled:Timestamp|null,
  startedBackfillAt:Timestamp|null,
  state:ItemPriceHistoryState,

}

const result = repositoryFactory.build<ItemPriceHistoryEntity>(COLLECTION_NAME);
export const itemPriceHistoryRepository = result.repository;
export const baseItemPriceHistoryCreator = result.creator;
export const baseItemPriceHistoryUpdater = result.updater;
export const baseItemPriceHistoryDeleter = result.deleter;