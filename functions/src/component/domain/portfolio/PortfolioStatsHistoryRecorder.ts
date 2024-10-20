import {PortfolioStatsEntity, portfolioStatsRepository} from "./PortfolioStatsEntity";
import {
  portfolioStatsHistoryCreator,
  PortfolioStatsHistoryEntity,
  portfolioStatsHistoryRepository,
} from "./PortfolioStatsHistoryEntity";
import {FieldValue, TimestampStatic} from "../../external-lib/Firebase";
import {SortOrder} from "../../database/BaseCrudRepository";
import {portfolioStatsHistoryRetriever} from "./PortfolioStatsHistoryRetriever";
import {timestampToMoment} from "../../tools/TimeConverter";
import moment from "moment";
import {Update} from "../../database/Entity";

const onStatsUpdated = async (stats:PortfolioStatsEntity):Promise<void> => {

  const mostRecentHistory = await portfolioStatsHistoryRetriever.retrieveMostRecentHistoryForPortfolio(stats.id)
  const shouldCreateNewEntry = !mostRecentHistory || timestampToMoment(mostRecentHistory.timestamp).isBefore(moment().startOf('day'))
  if (shouldCreateNewEntry) {
    await portfolioStatsHistoryCreator.create({
      portfolioStatsId: stats.id,
      timestamp: TimestampStatic.now(),
      userId: stats.userId,
      currencyCode: stats.currencyCode,
      lastUpdate: stats.lastUpdate,
      nextUpdate: stats.nextUpdate,
      recalculationTimeoutTimestamp: stats.recalculationTimeoutTimestamp,
      ownedItemStats: stats.ownedItemStats,
      collectionStats: stats.collectionStats,
      inventoryItemStats: stats.inventoryItemStats,
    })
    return
  }

  await portfolioStatsHistoryRepository.getFirestoreDatabase().runTransaction(async transaction => {
    if (!mostRecentHistory) {
      return
    }
    const portfolioHistoryCollectionRef = portfolioStatsHistoryRepository.getFirebaseCollection()
    const portfolioHistoryDocRef = portfolioHistoryCollectionRef.doc(mostRecentHistory.id)

    const currentPortfolioHistoryDoc = await transaction.get(portfolioHistoryDocRef)
    const currentPortfolioHistory = portfolioStatsHistoryRepository.convert(currentPortfolioHistoryDoc?.data())
    if (!currentPortfolioHistory) {
      return
    }

    const update:Update<PortfolioStatsHistoryEntity> = {
      timestamp: TimestampStatic.now(),
      lastUpdate: stats.lastUpdate,
      nextUpdate: stats.nextUpdate,
      recalculationTimeoutTimestamp: stats.recalculationTimeoutTimestamp,
      ownedItemStats: stats.ownedItemStats,
      collectionStats: stats.collectionStats,
      inventoryItemStats: stats.inventoryItemStats,
    }
    const dateLastModified = FieldValue.serverTimestamp();
    await transaction.update(portfolioHistoryDocRef, {...update, dateLastModified})
  })


}

export const portfolioStatsHistoryRecorder = {
  onStatsUpdated,
}