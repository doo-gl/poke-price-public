import {PortfolioStats} from "./PortfolioStatsEntity";


export interface PortfolioStatsDto {
  portfolioId:string,
  username:string|null,
  lastUpdatedAt:string|null,
  isBeingRecalculated:boolean,
  currentStats:PortfolioStats,
  history:Array<HistoricalPortfolioStatsDto>
  isPublic:boolean,
}

export interface HistoricalPortfolioStatsDto extends Omit<PortfolioStats, 'historicalStats'> {
  timestamp:string
  portfolioStatsHistoryId:string,
}