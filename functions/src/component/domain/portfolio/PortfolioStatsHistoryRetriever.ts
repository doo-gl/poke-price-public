import {Moment} from "moment";
import {PortfolioStatsHistoryEntity, portfolioStatsHistoryRepository} from "./PortfolioStatsHistoryEntity";
import {momentToTimestamp} from "../../tools/TimeConverter";
import {SortOrder} from "../../database/BaseCrudRepository";
import {extractUserCurrencyCode, UserEntity} from "../user/UserEntity";


const retrieveHistory = async (user:UserEntity, from:Moment, to:Moment):Promise<Array<PortfolioStatsHistoryEntity>> => {
  const userId = user.id;
  const currencyCode = extractUserCurrencyCode(user)
  return await portfolioStatsHistoryRepository.getMany([
    { field: 'userId', operation: '==', value: userId },
    { field: 'currencyCode', operation: '==', value: currencyCode },
    { field: 'timestamp', operation: '>=', value: momentToTimestamp(from) },
    { field: 'timestamp', operation: '<', value: momentToTimestamp(to) },
  ])
}

const retrieveMostRecentHistory = async (user:UserEntity):Promise<PortfolioStatsHistoryEntity|null> => {
  const currencyCode = extractUserCurrencyCode(user)
  const stats = await portfolioStatsHistoryRepository.getMany(
    [
      { field: 'userId', operation: '==', value: user.id },
      { field: 'currencyCode', operation: '==', value: currencyCode },
    ],
    {
      limit: 1,
      sort: [ {field: 'timestamp', order: SortOrder.DESC } ],
    }
  )
  return stats[0]
}

const retrieveMostRecentHistoryForPortfolio = async (portfolioId:string):Promise<PortfolioStatsHistoryEntity|null> => {
  const stats = await portfolioStatsHistoryRepository.getMany(
    [
      {field: "portfolioStatsId", operation: "==", value: portfolioId},
    ],
    {
      limit: 1,
      sort: [ {field: 'timestamp', order: SortOrder.DESC } ],
    }
  )
  return stats[0] ?? null
}

const retrieveByUserId = async (userId:string):Promise<Array<PortfolioStatsHistoryEntity>> => {
  // intentionally ignores currency codes because it is used by gdpr deleter to get all history
  return portfolioStatsHistoryRepository.getMany([
    {field: "userId", operation: "==", value: userId},
  ])
}

const retrieveByPortfolioId = async (portfolioStatsId:string):Promise<Array<PortfolioStatsHistoryEntity>> => {
  return portfolioStatsHistoryRepository.getMany([
    {field: "portfolioStatsId", operation: "==", value: portfolioStatsId},
  ])
}

export const portfolioStatsHistoryRetriever = {
  retrieveHistory,
  retrieveMostRecentHistory,
  retrieveMostRecentHistoryForPortfolio,
  retrieveByUserId,
  retrieveByPortfolioId,
}