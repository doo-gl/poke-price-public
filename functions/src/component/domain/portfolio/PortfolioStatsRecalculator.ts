import {
  PortfolioStats,
  PortfolioStatsEntity,
  portfolioStatsRepository,
  portfolioStatsUpdater,
} from "./PortfolioStatsEntity";
import {CardOwnershipEntity} from "../card-ownership/CardOwnershipEntity";
import {InventoryItemEntity} from "../inventory/InventoryItemEntity";
import {portfolioStatsCalculator} from "./PortfolioStatsCalculator";
import {userRetriever} from "../user/UserRetriever";
import {Update} from "../../database/Entity";
import {portfolioStatsHistoryRecorder} from "./PortfolioStatsHistoryRecorder";
import {toSet} from "../../tools/SetBuilder";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {momentToTimestamp, timestampToMoment} from "../../tools/TimeConverter";
import moment from "moment";
import {portfolioStatsGetserter} from "./PortfolioStatsGetserter";
import {JSONSchemaType} from "ajv";
import {portfolioEmailScheduler} from "./PortfolioEmailScheduler";
import {logger} from "firebase-functions";
import {FieldValue, TimestampStatic} from "../../external-lib/Firebase";
import {portfolioStatsRetriever} from "./PortfolioStatsRetriever";
import {statCalculationContextBuilder} from "./StatCalculationContextBuilder";
import {uuid} from "../../external-lib/Uuid";


export interface PortfolioStatsRecalculationRequest {
  userId:string,
}
export const portfolioStatsRecalculationSchema:JSONSchemaType<PortfolioStatsRecalculationRequest> = {
  type: "object",
  properties: {
    userId: { type: "string" },
  },
  additionalProperties: false,
  required: ["userId"],
}

const extractUserId = <T extends {userId:string}> (values:Array<T>):string|null => {
  if (values.length === 0) {
    return null
  }
  const userIds = toSet(values, value => value.userId)
  if (userIds.size > 1) {
    throw new InvalidArgumentError(`Cannot update ownerships for more than one user, found: ${[...userIds].join(',')}`)
  }
  const userId = [...userIds].find(() => true)
  if (!userId) {
    throw new InvalidArgumentError(`No user ids provided`)
  }
  return userId
}

const updateStats = async (statsEntity:PortfolioStatsEntity, newStats:PortfolioStats):Promise<PortfolioStatsEntity> => {
  const update:Update<PortfolioStatsEntity> = {
    lastUpdate: TimestampStatic.now(),
    nextUpdate: momentToTimestamp(moment().add(7, 'days')),
    currencyCode: newStats.currencyCode,
    ownedItemStats: newStats.ownedItemStats,
    inventoryItemStats: newStats.inventoryItemStats,
    collectionStats: newStats.collectionStats,
    historicalStats: newStats.historicalStats ?? {stats: []},
    recalculationTimeoutTimestamp: null,
  }
  const updatedStats = await portfolioStatsUpdater.updateAndReturn(statsEntity.id, update)
  await portfolioStatsHistoryRecorder.onStatsUpdated(updatedStats)
  await portfolioEmailScheduler.onPortfolioStatsUpdated(updatedStats)
  return updatedStats
}

const updateStatsInTransaction = async (
  portfolio:PortfolioStatsEntity,
  newStatsCalculator:(portfolio:PortfolioStatsEntity) => PortfolioStats
):Promise<PortfolioStatsEntity> => {

  const requestId = uuid()

  await portfolioStatsRepository.getFirestoreDatabase().runTransaction(async transaction => {
    const portfolioCollectionRef = portfolioStatsRepository.getFirebaseCollection()
    const portfolioDocRef = portfolioCollectionRef.doc(portfolio.id)
    const currentPortfolioDoc = await transaction.get(portfolioDocRef)
    const currentPortfolio = portfolioStatsRepository.convert(currentPortfolioDoc?.data())
    if (!currentPortfolio) {
      return
    }
    const newStats = newStatsCalculator(currentPortfolio)
    const update:Update<PortfolioStatsEntity> = {
      lastUpdate: TimestampStatic.now(),
      nextUpdate: momentToTimestamp(moment().add(7, 'days')),
      currencyCode: newStats.currencyCode,
      ownedItemStats: newStats.ownedItemStats,
      inventoryItemStats: newStats.inventoryItemStats,
      collectionStats: newStats.collectionStats,
      historicalStats: newStats.historicalStats ?? {stats: []},
      recalculationTimeoutTimestamp: null,
    }
    const dateLastModified = FieldValue.serverTimestamp();
    await transaction.update(portfolioDocRef, {...update, dateLastModified})
  })
  const updatedPortfolio = await portfolioStatsRetriever.retrieve(portfolio.id)
  await portfolioStatsHistoryRecorder.onStatsUpdated(updatedPortfolio)
  await portfolioEmailScheduler.onPortfolioStatsUpdated(updatedPortfolio)
  return updatedPortfolio
}

const updateTimeout = async (stats:PortfolioStatsEntity) => {
  await portfolioStatsUpdater.updateOnly(stats.id, {
    recalculationTimeoutTimestamp: momentToTimestamp(moment().add(5, 'minutes')),
  })
}

const isAlreadyBeingRecalculated = (stats:PortfolioStatsEntity):boolean => {
  return !!stats.recalculationTimeoutTimestamp
    && moment().isBefore(timestampToMoment(stats.recalculationTimeoutTimestamp))
}

const getStatsForUpdate = async <T extends {userId:string}> (values:Array<T>):Promise<PortfolioStatsEntity|null> => {
  const userId = extractUserId(values)
  if (!userId) {
    return null
  }
  const user = await userRetriever.retrieve(userId)
  const statsEntity = await portfolioStatsGetserter.getOrCreatePortfolioStats(user)
  if (isAlreadyBeingRecalculated(statsEntity)) {
    return null
  }
  return statsEntity
}

const recalculate = async (userId:string):Promise<PortfolioStatsEntity> => {
  logger.info(`Attempting to recalculate portfolio stats for user: ${userId}`)
  const user = await userRetriever.retrieve(userId)
  const portfolio = await portfolioStatsGetserter.getOrCreatePortfolioStats(user)
  return recalculateForPortfolio(portfolio)
}

const recalculateForPortfolio = async (portfolio:PortfolioStatsEntity):Promise<PortfolioStatsEntity> => {
  if (isAlreadyBeingRecalculated(portfolio)) {
    logger.info(`Stats for user: ${portfolio.userId} have already been calculated`)
    return portfolio
  }
  await updateTimeout(portfolio)
  const newlyCalculatedStats = await portfolioStatsCalculator.calculate(portfolio.userId, portfolio)
  const updatedStats = await updateStats(portfolio, newlyCalculatedStats)
  return updatedStats
}

const recalculateForPortfolioId = async (portfolioId:string):Promise<PortfolioStatsEntity> => {
  const portfolio = await portfolioStatsRetriever.retrieve(portfolioId)
  return recalculateForPortfolio(portfolio)
}

const onInventoryItemsAddedV2 = async (inventoryItems:Array<InventoryItemEntity>, ownerships:Array<CardOwnershipEntity>):Promise<void> => {

  const statsEntity = await getStatsForUpdate(inventoryItems)
  if (!statsEntity) {
    return
  }

  const context = await statCalculationContextBuilder.buildForPartialInventoryUpdate(
    statsEntity,
    inventoryItems,
    ownerships
  )

  const newStatsCalculator = (portfolio:PortfolioStatsEntity):PortfolioStats => {
    return portfolioStatsCalculator.onInventoryItemsAddedV2(portfolio, context)
  }

  await updateStatsInTransaction(statsEntity, newStatsCalculator)

}

const onInventoryItemsRemovedV2 = async (inventoryItems:Array<InventoryItemEntity>, ownerships:Array<CardOwnershipEntity>):Promise<void> => {

  const statsEntity = await getStatsForUpdate(inventoryItems)
  if (!statsEntity) {
    return
  }

  const context = await statCalculationContextBuilder.buildForPartialInventoryUpdate(
    statsEntity,
    inventoryItems,
    ownerships
  )

  const newStatsCalculator = (portfolio:PortfolioStatsEntity):PortfolioStats => {
    return portfolioStatsCalculator.onInventoryItemsRemovedV2(portfolio, context)
  }

  await updateStatsInTransaction(statsEntity, newStatsCalculator)

}

export const portfolioStatsRecalculator = {
  recalculate,
  recalculateForPortfolio,
  recalculateForPortfolioId,
  onInventoryItemsAddedV2,
  onInventoryItemsRemovedV2,
}