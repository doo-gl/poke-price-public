import {PublicPortfolioDto} from "./PublicPortfolioDto";
import {portfolioStatsRetriever} from "../PortfolioStatsRetriever";
import {publicPortfolioMapper} from "./PublicPortfolioMapper";
import {userRetriever} from "../../user/UserRetriever";


const retrieve = async (portfolioId:string):Promise<PublicPortfolioDto> => {
  const portfolio = await portfolioStatsRetriever.retrieveOptional(portfolioId)
  if (!portfolio || !portfolio.isPublic) {
    return { username: null, stats: null, visible: false }
  }
  const user = await userRetriever.retrieveOptional(portfolio.userId)
  if (!user) {
    return { username: null, stats: null, visible: false }
  }
  return publicPortfolioMapper.mapPublic(user, portfolio)
}

export const publicPortfolioRetriever = {
  retrieve,
}