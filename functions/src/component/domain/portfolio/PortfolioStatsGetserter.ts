import {portfolioStatsCreator, PortfolioStatsEntity} from "./PortfolioStatsEntity";
import {portfolioStatsRetriever} from "./PortfolioStatsRetriever";
import {portfolioStatsCalculator} from "./PortfolioStatsCalculator";
import {extractUserCurrencyCode, UserEntity} from "../user/UserEntity";


const getOrCreatePortfolioStats = async (user:UserEntity):Promise<PortfolioStatsEntity> => {
  const userId = user.id
  const currencyCode = extractUserCurrencyCode(user);
  const statsWithCurrency = await portfolioStatsRetriever.retrieveByUserInPreferredCurrency(user);
  if (statsWithCurrency) {
    return statsWithCurrency
  }
  // in case the user has portfolio stats with no currency code, check
  const statsEntity = await portfolioStatsRetriever.retrieveByUserId(userId);
  if (statsEntity) {
    return statsEntity
  }
  const emptyStats = portfolioStatsCalculator.emptyStats(userId, currencyCode)
  const newStatsEntity = await portfolioStatsCreator.create({
    userId,
    currencyCode,
    ownedItemStats: emptyStats.ownedItemStats,
    inventoryItemStats: emptyStats.inventoryItemStats,
    collectionStats: emptyStats.collectionStats,
    historicalStats: emptyStats.historicalStats,
    lastUpdate: null,
    nextUpdate: null,
    recalculationTimeoutTimestamp: null,
  })
  return newStatsEntity;
}

export const portfolioStatsGetserter = {
  getOrCreatePortfolioStats,
}