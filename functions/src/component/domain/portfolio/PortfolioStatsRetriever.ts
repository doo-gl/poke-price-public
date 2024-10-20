import {PortfolioStatsEntity, portfolioStatsRepository} from "./PortfolioStatsEntity";
import {byIdRetriever} from "../../database/ByIdRetriever";
import {singleResultRepoQuerier} from "../../database/SingleResultRepoQuerier";
import {Moment} from "moment";
import {momentToTimestamp} from "../../tools/TimeConverter";
import {CurrencyCode} from "../money/CurrencyCodes";
import {extractUserCurrencyCode, UserEntity} from "../user/UserEntity";

const retrieve = (id:string):Promise<PortfolioStatsEntity> => {
  return byIdRetriever.retrieve(
    portfolioStatsRepository,
    id,
    portfolioStatsRepository.collectionName
  )
}
const retrieveOptional = (id:string):Promise<PortfolioStatsEntity|null> => {
  return portfolioStatsRepository.getOne(id)
}

const retrieveByUserId = (userId:string):Promise<PortfolioStatsEntity|null> => {
  return singleResultRepoQuerier.query(
    portfolioStatsRepository,
    [{ name: "userId", value: userId }],
    portfolioStatsRepository.collectionName
  )
}

const retrieveByUserInPreferredCurrency = (user:UserEntity):Promise<PortfolioStatsEntity|null> => {
  const userId = user.id;
  const currencyCode = extractUserCurrencyCode(user)
  return singleResultRepoQuerier.query(
    portfolioStatsRepository,
    [
      { name: "userId", value: userId },
      { name: "currencyCode", value: currencyCode },
    ],
    portfolioStatsRepository.collectionName
  )
}

const retrieveByNextUpdate = (to:Moment, limit:number):Promise<Array<PortfolioStatsEntity>> => {
  return portfolioStatsRepository.getMany(
    [ { field: 'nextUpdate', operation: "<=", value: momentToTimestamp(to) } ],
    { limit }
  )
}


export const portfolioStatsRetriever = {
  retrieve,
  retrieveOptional,
  retrieveByUserId,
  retrieveByUserInPreferredCurrency,
  retrieveByNextUpdate,
}