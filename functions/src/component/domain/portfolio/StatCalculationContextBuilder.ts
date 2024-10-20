import {StatCalculationContext} from "./StatCalculationContext";
import {InventoryItemEntity, inventoryItemRepository} from "../inventory/InventoryItemEntity";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";
import {batchArray} from "../../tools/ArrayBatcher";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {userRetriever} from "../user/UserRetriever";
import {extractUserCurrencyCode} from "../user/UserEntity";
import {currencyExchanger} from "../money/CurrencyExchanger";
import {ItemEntity, legacyIdOrFallback} from "../item/ItemEntity";
import {cardCollectionOwnershipRepository} from "../card-collection/CardCollectionOwnershipRepository";
import {cardCollectionRetriever} from "../card-collection/CardCollectionRetriever";
import {CardOwnershipEntity} from "../card-ownership/CardOwnershipEntity";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {toSet} from "../../tools/SetBuilder";
import {CardCollectionOwnershipEntity} from "../card-collection/CardCollectionOwnershipEntity";
import {dedupe} from "../../tools/ArrayDeduper";
import {toInputValueMap} from "../../tools/MapBuilder";
import {PortfolioStatsEntity} from "./PortfolioStatsEntity";
import {PortfolioStatsHistoryEntity, portfolioStatsHistoryRepository} from "./PortfolioStatsHistoryEntity";
import {portfolioHistoryTimeGroupCleaner} from "./PortfolioHistoryTimeGroupCleaner";
import {portfolioStatsGetserter} from "./PortfolioStatsGetserter";
import {CardCollectionEntity} from "../card-collection/CardCollectionEntity";
import {cardCollectionRepository} from "../card-collection/CardCollectionRepository";
import {cardCollectionOwnershipRetriever} from "../card-collection/CardCollectionOwnershipRetriever";

const build = async (userId:string, preExistingPortfolio:PortfolioStatsEntity|null):Promise<StatCalculationContext> => {
  const user = await userRetriever.retrieve(userId)
  const userCurrencyCode = extractUserCurrencyCode(user)
  const exchanger = await currencyExchanger.buildExchanger(userCurrencyCode)
  const portfolio = preExistingPortfolio
    ? preExistingPortfolio
    : (await portfolioStatsGetserter.getOrCreatePortfolioStats(user))

  const context = new StatCalculationContext(
    userCurrencyCode,
    exchanger,
    portfolio,
  )

  const cardIdSet = new Set<string>()
  const items = new Array<ItemEntity>()

  await inventoryItemRepository.iterator()
    .queries([
      { field: "userId", operation: "==", value: userId },
    ])
    .batchSize(500)
    .iterateBatch(async inventoryItems => {
      inventoryItems.forEach(inventoryItem => {
        cardIdSet.add(inventoryItem.itemId)
        context.addInventoryItem(inventoryItem)
      })
    })
  const queue = new ConcurrentPromiseQueue({maxNumberOfConcurrentPromises: 1})
  const cardIdBatches = batchArray([...cardIdSet.values()], 50)
  await Promise.all(
    cardIdBatches.map(async cardIdBatch => {
      await queue.addPromise(async () => {

        const cards = await cardItemRetriever.retrieveByIds(cardIdBatch)
        cards.forEach(card => {
          context.addItem(card)
          items.push(card)
        })

      })
    })
  )

  await cardCollectionOwnershipRepository.iterator()
    .batchSize(5)
    .queries([
      { field: 'userId', operation: '==', value: userId },
    ])
    .iterate(async collectionOwnership => {
      const collection = await cardCollectionRetriever.retrieve(collectionOwnership.cardCollectionId)
      context.addCollection(collection)
      context.addOwnedCollection(collectionOwnership)
    })


  const allHistoryEntries = new Array<PortfolioStatsHistoryEntity>()
  await portfolioStatsHistoryRepository.iterator()
    .queries([
      {field: "portfolioStatsId", operation: "==", value: context.getPortfolio().id},
    ])
    .iterate(async historyEntry => {
      allHistoryEntries.push(historyEntry)
    })

  const cleanedHistory = await portfolioHistoryTimeGroupCleaner.clean(allHistoryEntries)
  context.addPortfolioHistory(cleanedHistory)

  return context;
}

const buildForPartialInventoryUpdate = async (
  portfolio:PortfolioStatsEntity,
  inventoryItems:Array<InventoryItemEntity>,
  ownerships:Array<CardOwnershipEntity>
):Promise<StatCalculationContext> => {

  const userId = portfolio.userId

  const wrongInv = inventoryItems.filter(inv => inv.userId !== userId)
  if (wrongInv.length > 0) {
    throw new InvalidArgumentError(`Cannot create portfolio context as inventory: ${wrongInv.map(inv => inv.id).join(',')}, do not have user id: ${userId}`)
  }
  const wrongOwnerships = ownerships.filter(own => own.userId !== userId)
  if (wrongOwnerships.length > 0) {
    throw new InvalidArgumentError(`Cannot create portfolio context as ownership: ${wrongOwnerships.map(own => own.id).join(',')}, do not have user id: ${userId}`)
  }

  const user = await userRetriever.retrieve(userId)
  const userCurrencyCode = extractUserCurrencyCode(user)
  const exchanger = await currencyExchanger.buildExchanger(userCurrencyCode)
  const context = new StatCalculationContext(
    userCurrencyCode,
    exchanger,
    portfolio,
  )

  const cardIdSet = new Set<string>()

  inventoryItems.forEach(inventoryItem => {
    cardIdSet.add(inventoryItem.itemId)
    context.addInventoryItem(inventoryItem)
  })
  ownerships.forEach(ownership => {
    cardIdSet.add(ownership.cardId)
    context.addItemOwnership(ownership)
  })

  const items = new Array<ItemEntity>()
  const queue = new ConcurrentPromiseQueue({maxNumberOfConcurrentPromises: 1})
  const cardIdBatches = batchArray([...cardIdSet.values()], 50)
  await Promise.all(
    cardIdBatches.map(async cardIdBatch => {
      await queue.addPromise(async () => {

        const cards = await cardItemRetriever.retrieveByIds(cardIdBatch)
        cards.forEach(card => {
          context.addItem(card)
          items.push(card)
        })

      })
    })
  )

  const uniqueItemIds = toSet(items, it => legacyIdOrFallback(it))
  const batchedItemIds = batchArray([...uniqueItemIds.values()], 10)

  const collections = new Array<CardCollectionEntity>()
  await Promise.all(batchedItemIds.map(itemIdBatch => queue.addPromise(async () => {
    const collectionResult = await cardCollectionRepository.getMany([
      {field: "visibleCardIds", operation: "array-contains-any", value: itemIdBatch},
    ])
    collectionResult.forEach(col => collections.push(col))
  })))
  const uniqueCollections = dedupe(collections, col => col.id)

  const collectionOwnerships = await cardCollectionOwnershipRetriever.retrieveByUserIdAndCollectionIds(
    userId,
    uniqueCollections.map(col => col.id)
  )
  uniqueCollections.forEach(col => context.addCollection(col))
  collectionOwnerships.forEach(own => context.addOwnedCollection(own))

  return context
}

export const statCalculationContextBuilder = {
  build,
  buildForPartialInventoryUpdate,
}