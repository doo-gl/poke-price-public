import {CurrencyAmountLike} from "../money/CurrencyAmount";
import {InventoryItemEntity} from "../inventory/InventoryItemEntity";
import {ItemEntity, legacyIdOrFallback, PriceSource} from "../item/ItemEntity";
import {itemPriceQuerier} from "../item/ItemPriceQuerier";
import {CurrencyCode} from "../money/CurrencyCodes";
import {dedupe, dedupeInOrder} from "../../tools/ArrayDeduper";
import {CurrencyExchanger, currencyExchanger, ExchangeRate} from "../money/CurrencyExchanger";
import {removeNulls} from "../../tools/ArrayNullRemover";
import {CardCollectionEntity} from "../card-collection/CardCollectionEntity";
import {CardCollectionOwnershipEntity} from "../card-collection/CardCollectionOwnershipEntity";
import {CardOwnershipEntity} from "../card-ownership/CardOwnershipEntity";
import {InventoryItemWithStat} from "./InventoryItemStatsCalculator";
import {PortfolioStatsHistoryEntity} from "./PortfolioStatsHistoryEntity";
import {PortfolioStatsEntity} from "./PortfolioStatsEntity";
import {toInputValueMap} from "../../tools/MapBuilder";

export interface ItemStat {
  itemId:string,
  soldPrice:CurrencyAmountLike|null,
  soldPriceSource:PriceSource|null,
  modificationKeyToPrice:{[key:string]:CurrencyAmountLike}
}

export const emptyItemStat = (itemId:string):ItemStat => {
  return {
    itemId,
    soldPrice: null,
    soldPriceSource: null,
    modificationKeyToPrice: {},
  }
}

export interface CollectionWithOwnership {
  collectionId:string,
  isRoot:boolean,
  collection:CardCollectionEntity,
  ownership:CardCollectionOwnershipEntity,
}

export class StatCalculationContext {

  userCurrencyCode:CurrencyCode
  exchanger:CurrencyExchanger
  portfolio:PortfolioStatsEntity
  itemIdToStats:{[itemId:string]: ItemStat} = {}
  ownedItemIds = new Set<string>()
  inventoryItems:Array<InventoryItemEntity> = []
  collections:Array<CardCollectionEntity> = []
  ownedCollections:Array<CardCollectionOwnershipEntity> = []
  itemOwnerships:Array<CardOwnershipEntity> = []
  portfolioHistory:Array<PortfolioStatsHistoryEntity> = []

  constructor(
    userCurrencyCode:CurrencyCode,
    exchanger:CurrencyExchanger,
    portfolio:PortfolioStatsEntity,
  ) {
    this.userCurrencyCode = userCurrencyCode;
    this.exchanger = exchanger
    this.portfolio = portfolio
  }

  addItem(item:ItemEntity) {
    const itemId = item._id.toString()
    const legacyItemId = item.legacyId
    const pokePrice = itemPriceQuerier.pokePrice(item, this.userCurrencyCode)
    const modificationKeyToPrice = itemPriceQuerier.modificationPrices(
      item,
      this.userCurrencyCode,
      this.exchanger
    )
    const itemStat:ItemStat = {
      itemId: legacyIdOrFallback(item),
      soldPrice: pokePrice?.price ?? null,
      soldPriceSource: pokePrice?.priceSource ?? null,
      modificationKeyToPrice,
    }
    this.ownedItemIds.add(itemId)
    this.itemIdToStats[itemId] = itemStat
    if (legacyItemId) {
      this.ownedItemIds.add(legacyItemId)
      this.itemIdToStats[legacyItemId] = itemStat
    }
  }

  addCollection(collection:CardCollectionEntity) {
    this.collections.push(collection)
  }

  addOwnedCollection(ownedCollection:CardCollectionOwnershipEntity) {
    this.ownedCollections.push(ownedCollection)
  }

  addInventoryItem(inventoryItem:InventoryItemEntity) {
    this.inventoryItems.push(inventoryItem)
  }

  addItemOwnership(ownership:CardOwnershipEntity) {
    this.itemOwnerships.push(ownership)
  }

  addPortfolioHistory(history:Array<PortfolioStatsHistoryEntity>) {
    const currencyCode = this.userCurrencyCode
    this.portfolioHistory = history.filter(stat => stat.currencyCode === currencyCode)
  }

  ownsItem(itemIdOrLegacyId:string):boolean {
    return this.ownedItemIds.has(itemIdOrLegacyId)
  }

  getSoldPrice(itemId:string):CurrencyAmountLike|null {
    return this.itemIdToStats[itemId]?.soldPrice ?? null
  }

  getOwnershipItemStats():Array<ItemStat> {
    const itemIdToStat = this.itemIdToStats
    return dedupeInOrder(
      removeNulls(
        this.itemOwnerships.map(ownership => itemIdToStat[ownership.cardId] ?? null)
      ),
      val => val.itemId
    )
  }

  getStat(itemId:string):ItemStat|null {
    return this.itemIdToStats[itemId] ?? null
  }

  getAllStats():Array<ItemStat> {
    return dedupe(Object.values(this.itemIdToStats), stat => stat.itemId)
  }

  getAllInventoryItems():Array<InventoryItemEntity> {
    return this.inventoryItems.slice()
  }

  getAllInventoryItemsWithStats():Array<InventoryItemWithStat> {
    const itemIdToStat = this.itemIdToStats
    return dedupeInOrder(
      removeNulls(
        this.inventoryItems.map(inventoryItem => {
          const item = itemIdToStat[inventoryItem.itemId] ?? null
          if (!item) {
            return null
          }
          return {inventoryItem, item}
        })
      ),
      val => val.inventoryItem.id
    )
  }

  getHistory() {
    return this.portfolioHistory.slice()
  }

  getPortfolio() {
    return this.portfolio
  }

  getUserCurrencyCode():CurrencyCode {
    return this.userCurrencyCode;
  }

  getCollections():Array<CardCollectionEntity> {
    return this.collections.slice();
  }

  getCollectionOwnerships():Array<CardCollectionOwnershipEntity> {
    return this.ownedCollections.slice();
  }

  getCollectionsWithOwnerships():Array<CollectionWithOwnership> {
    const collectionIdToCollection = toInputValueMap(this.collections, col => col.id)
    return removeNulls(
      this.getCollectionOwnerships().map(ownership => {
        const collection = collectionIdToCollection.get(ownership.cardCollectionId) ?? null
        if (!collection) {
          return null
        }
        return {
          collectionId: collection.id,
          isRoot: collection.parentCollectionId === null,
          collection,
          ownership,
        }
      })
    )
  }

}