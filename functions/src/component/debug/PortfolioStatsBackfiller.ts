import {
  PortfolioStatsHistoryEntity,
  portfolioStatsHistoryRepository,
} from "../domain/portfolio/PortfolioStatsHistoryEntity";
import {SortOrder} from "../database/BaseCrudRepository";
import {cardOwnershipRepository} from "../domain/card-ownership/CardOwnershipRepository";
import {comparatorBuilder} from "../infrastructure/ComparatorBuilder";
import {momentToTimestamp, timestampToMoment} from "../tools/TimeConverter";
import moment, {Moment} from "moment";
import {toInputValueMap} from "../tools/MapBuilder";
import {CardOwnershipEntity} from "../domain/card-ownership/CardOwnershipEntity";
import {cardCollectionRepository} from "../domain/card-collection/CardCollectionRepository";
import {CardCollectionEntity} from "../domain/card-collection/CardCollectionEntity";
import {PortfolioStats} from "../domain/portfolio/PortfolioStatsEntity";
import {StatCalculationContext} from "../domain/portfolio/StatCalculationContext";
import {ownedItemStatsCalculator} from "../domain/portfolio/OwnedItemStatsCalculator";
import {removeNulls} from "../tools/ArrayNullRemover";
import {CurrencyCode} from "../domain/money/CurrencyCodes";
import {ownedSingleCollectionStatsCalculator} from "../domain/portfolio/OwnedSingleCollectionStatsCalculator";
import {ownedCollectionStatsCalculator} from "../domain/portfolio/OwnedCollectionStatsCalculator";
import {inventoryItemStatsCalculator, InventoryItemWithStat} from "../domain/portfolio/InventoryItemStatsCalculator";
import {Zero} from "../domain/money/CurrencyAmount";
import {CardCondition} from "../domain/historical-card-price/CardCondition";
import {ItemType} from "../domain/item/ItemEntity";
import {portfolioStatsGetserter} from "../domain/portfolio/PortfolioStatsGetserter";
import {Create} from "../database/Entity";
import {uniqueItemsInCollectionStatsCalculator} from "../domain/portfolio/UniqueItemsInCollectionStatsCalculator";
import {TimestampStatic} from "../external-lib/Firebase";
import {itemRetriever} from "../domain/item/ItemRetriever";
import {userRetriever} from "../domain/user/UserRetriever";
import {extractUserCurrencyCode} from "../domain/user/UserEntity";
import {currencyExchanger} from "../domain/money/CurrencyExchanger";
import {historicalStatsCalculator} from "../domain/portfolio/HistoricalStatsCalculator";

interface CollectionContext {
  collectionIdToCollection:Map<string, CardCollectionEntity>,
  cardIdToCollections:Map<string, Array<CardCollectionEntity>>
}

const getFirstPortfolioStats = async (userId:string):Promise<PortfolioStatsHistoryEntity|null> => {
  const firstPortfolioStats = await portfolioStatsHistoryRepository.getMany(
    [{ field: "userId", operation: "==", value: userId }],
    {
      limit: 1,
      sort: [{field: "timestamp", order: SortOrder.ASC}],
    }
  )
  if (firstPortfolioStats.length === 0) {
    return null
  }
  return firstPortfolioStats[0]
}

const datesToGenerateStatsFor = (start:Moment, end:Moment):Array<Moment> => {
  let date = start.clone()
  const dates:Array<Moment> = []
  while (date.isBefore(end)) {
    if (date.day() === 6) { // Saturday
      dates.push(date.clone())
    }
    date = date.clone().add(1, 'day')
  }
  return dates
}

const createStats = (
  date:Moment,
  userId:string,
  ownerships:Array<CardOwnershipEntity>,
  context:StatCalculationContext,
  collectionContext:CollectionContext
):PortfolioStats => {
  const currencyCode = context.getUserCurrencyCode()
  const ownershipsBeforeDate = ownerships.filter(ownership => timestampToMoment(ownership.dateCreated).isBefore(date))
  const items = removeNulls(ownershipsBeforeDate.map(ownership => context.getStat(ownership.cardId)))
  const ownedItemStats = ownedItemStatsCalculator.onItemsAdded(
    items,
    {
      totalValueOfOwnedItems: { amountInMinorUnits: 0, currencyCode },
      totalNumberOfOwnedItems: 0,
      mostValuableOwnedItems: [],
      mostValuableOwnedItemsIds: [],
    }
  )

  const collectionIdToCollection = collectionContext.collectionIdToCollection
  const cardIdToCollections = collectionContext.cardIdToCollections

  const collectionIdToOwnedItemIds = new Map<string, Array<string>>()
  items.forEach(item => {
    const collectionsForItem = cardIdToCollections.get(item.itemId) ?? []
    collectionsForItem.forEach(collection => {
      const ownedItemIds = collectionIdToOwnedItemIds.get(collection.id) ?? []
      ownedItemIds.push(item.itemId)
      collectionIdToOwnedItemIds.set(collection.id, ownedItemIds)
    })
  })

  const singleCollectionStats = removeNulls([...collectionIdToOwnedItemIds.entries()].map(entry => {
    const collectionId = entry[0]
    const ownedItemIds = entry[1]
    const collection = collectionIdToCollection.get(collectionId)
    if (!collection) {
      return null
    }
    return ownedSingleCollectionStatsCalculator.calculate(ownedItemIds, collection, context)
  }))

  const collectionStats = ownedCollectionStatsCalculator.calculateFromCollectionStats(singleCollectionStats)

  const inventoryItems:Array<InventoryItemWithStat> = removeNulls(ownershipsBeforeDate.map(ownership => {
    const item = context.getStat(ownership.cardId)
    if (!item) {
      return null
    }
    return {
      item,
      inventoryItem: {
        itemId: ownership.cardId,
        id: 'NOT_AN_ID',
        userId: ownership.userId,
        itemDetails: { condition: CardCondition.NEAR_MINT },
        itemType: ItemType.SINGLE_CARD,
        dateCreated: TimestampStatic.now(),
        amountPaid: null,
        images: null,
        dateLastModified: TimestampStatic.now(),
      },
    }
  }))
  const inventoryItemStats = inventoryItemStatsCalculator.onItemsAdded(
    inventoryItems,
    {
      totalNumberOfIndividualItems: 0,
      totalNumberOfIndividualItemsWithAmountPaid: 0,
      totalValueOfInventoryItems: Zero(currencyCode),
      totalProfitFromAmountPaid: Zero(currencyCode),
      totalAmountPaid: Zero(currencyCode),
      topInventoryItems: [],
      topInventoryItemIds: [],
    }
  )
  inventoryItemStats.topInventoryItemIds = []
  inventoryItemStats.topInventoryItems = []

  const portfolioStats:PortfolioStats = {
    userId,
    currencyCode: context.getUserCurrencyCode(),
    ownedItemStats,
    collectionStats,
    inventoryItemStats,
    historicalStats: {stats: []},
  }

  return portfolioStats
}

const backfill = async (userId:string):Promise<void> => {

  const user = await userRetriever.retrieve(userId)
  const currencyCode = extractUserCurrencyCode(user)
  const portfolioStats = await portfolioStatsGetserter.getOrCreatePortfolioStats(user)
  const firstPortfolioStats = await getFirstPortfolioStats(userId)
  const allCardOwnerships = await cardOwnershipRepository.getMany([
    {field: "userId", operation: "==", value: userId},
  ])
  const sortedOwnerships = allCardOwnerships.sort(comparatorBuilder.objectAttributeASC(value => value.dateCreated.toMillis()))
  if (sortedOwnerships.length === 0) {
    return
  }
  const start = timestampToMoment(sortedOwnerships[0].dateCreated)
  const end = firstPortfolioStats ? timestampToMoment(firstPortfolioStats.timestamp) : moment()
  const dates = datesToGenerateStatsFor(start, end)
  if (dates.length === 0) {
    return
  }
  const cardIds = sortedOwnerships.map(ownership => ownership.cardId)
  const items = await itemRetriever.retrieveManyByLegacyId(cardIds)
  const exchanger = await currencyExchanger.buildExchanger(currencyCode)
  const context = new StatCalculationContext(
    currencyCode,
    exchanger,
    portfolioStats,
  )
  items.forEach(item => context.addItem(item))
  const allCollections = await cardCollectionRepository.getMany([] )
  const allParentCollections = allCollections.filter(collection => !collection.parentCollectionId)

  const collectionIdToCollection = toInputValueMap(allParentCollections, input => input.id)
  const cardIdToCollections:Map<string, Array<CardCollectionEntity>> = new Map<string, Array<CardCollectionEntity>>()
  allParentCollections.forEach(collection => {
    collection.visibleCardIds.forEach(cardId => {
      const collectionsForCard = cardIdToCollections.get(cardId) ?? []
      collectionsForCard.push(collection)
      cardIdToCollections.set(cardId, collectionsForCard)
    })
  })
  const collectionContext:CollectionContext = { collectionIdToCollection, cardIdToCollections }

  const creates:Array<Create<PortfolioStatsHistoryEntity>> = []
  dates.forEach(date => {
    const stats = createStats(
      date,
      userId,
      sortedOwnerships,
      context,
      collectionContext
    )
    creates.push({
      userId,
      currencyCode,
      inventoryItemStats: stats.inventoryItemStats,
      collectionStats: stats.collectionStats,
      ownedItemStats: stats.ownedItemStats,
      timestamp: momentToTimestamp(date),
      portfolioStatsId: portfolioStats.id,
      nextUpdate: null,
      lastUpdate: null,
      recalculationTimeoutTimestamp: null,
    })
  })

  await portfolioStatsHistoryRepository.batchCreate(creates)
}

export const portfolioStatsBackfiller = {
  backfill,
}