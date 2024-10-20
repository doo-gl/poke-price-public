import {PortfolioStatsEntity} from "./PortfolioStatsEntity";
import {HistoricalPortfolioStatsDto, PortfolioStatsDto} from "./PortfolioStatsDto";
import {timestampToMoment} from "../../tools/TimeConverter";
import moment from "moment";
import {PortfolioStatsHistoryEntity} from "./PortfolioStatsHistoryEntity";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {UserEntity} from "../user/UserEntity";

const mapHistoryDto = (entity:PortfolioStatsHistoryEntity):HistoricalPortfolioStatsDto => {
  return {
    userId: entity.userId,
    currencyCode: entity.currencyCode,
    portfolioStatsHistoryId: entity.id,
    timestamp: timestampToMoment(entity.timestamp).toISOString(),
    ownedItemStats: entity.ownedItemStats,
    inventoryItemStats: entity.inventoryItemStats,
    collectionStats: entity.collectionStats,
  }
}

const mapDto = (entity:PortfolioStatsEntity, user:UserEntity):PortfolioStatsDto => {
  return {
    portfolioId: entity.id,
    username: user.details?.username ?? null,
    isPublic: entity.isPublic ?? true,
    currentStats: {
      userId: entity.userId,
      currencyCode: entity.currencyCode,
      inventoryItemStats: entity.inventoryItemStats,
      collectionStats: entity.collectionStats,
      ownedItemStats: entity.ownedItemStats,
      historicalStats: entity.historicalStats,
    },
    history: [],
    isBeingRecalculated: entity.recalculationTimeoutTimestamp !== null
      && timestampToMoment(entity.recalculationTimeoutTimestamp).isAfter(moment()),
    lastUpdatedAt: entity.lastUpdate ? entity.lastUpdate.toDate().toISOString() : null,
  }
}

export const portfolioStatsMapper = {
  mapDto,
}