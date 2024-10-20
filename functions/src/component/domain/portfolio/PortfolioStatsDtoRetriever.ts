import {HistoricalPortfolioStatsDto, PortfolioStatsDto} from "./PortfolioStatsDto";
import {portfolioStatsGetserter} from "./PortfolioStatsGetserter";
import {portfolioStatsMapper} from "./PortfolioStatsMapper";
import {portfolioStatsHistoryRetriever} from "./PortfolioStatsHistoryRetriever";
import moment from "moment";
import {userRetriever} from "../user/UserRetriever";
import {toInputValueMultiMap} from "../../tools/MapBuilder";
import {PortfolioStatsHistoryEntity} from "./PortfolioStatsHistoryEntity";
import {timestampToMoment} from "../../tools/TimeConverter";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {groupByDay} from "../../tools/GroupByDay";
import {portfolioStatsRetriever} from "./PortfolioStatsRetriever";
import {PortfolioStatsEntity} from "./PortfolioStatsEntity";

// const retrieveForPortfolio = async (portfolio:PortfolioStatsEntity):Promise<PortfolioStatsDto> => {
//   const user = await userRetriever.retrieve(portfolio.userId)
//   const history = await portfolioStatsHistoryRetriever.retrieveHistory(
//     user,
//     moment().subtract(360, 'day'),
//     moment(),
//   )
//
//   const newestHistories = groupByDay(
//     history,
//     val => timestampToMoment(val.timestamp)
//   )
//   return portfolioStatsMapper.mapDto(portfolio, newestHistories)
// }

const retrieveByUserId = async (userId:string):Promise<PortfolioStatsDto> => {
  const user = await userRetriever.retrieve(userId)
  const portfolio = await portfolioStatsGetserter.getOrCreatePortfolioStats(user)
  return portfolioStatsMapper.mapDto(portfolio, user)
}

const retrieve = async (portfolioId:string):Promise<PortfolioStatsDto> => {
  const portfolio = await portfolioStatsRetriever.retrieve(portfolioId)
  const user = await userRetriever.retrieve(portfolio.userId)
  return portfolioStatsMapper.mapDto(portfolio, user)
}

export const portfolioStatsDtoRetriever = {
  retrieveByUserId,
  retrieve,
}