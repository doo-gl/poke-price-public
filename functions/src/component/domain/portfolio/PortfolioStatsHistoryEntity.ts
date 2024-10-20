import {PortfolioStatsEntity} from "./PortfolioStatsEntity";
import {repositoryFactory} from "../../database/RepositoryFactory";
import {Timestamp} from "../../external-lib/Firebase";

const COLLECTION_NAME = 'portfolio-stats-history'

export interface PortfolioStatsHistoryEntity extends Omit<PortfolioStatsEntity, 'historicalStats'> {
  timestamp:Timestamp,
  portfolioStatsId:string,
}

const result = repositoryFactory.build<PortfolioStatsHistoryEntity>(COLLECTION_NAME);
export const portfolioStatsHistoryRepository = result.repository;
export const portfolioStatsHistoryCreator = result.creator;
export const portfolioStatsHistoryUpdater = result.updater;
export const portfolioStatsHistoryDeleter = result.deleter;