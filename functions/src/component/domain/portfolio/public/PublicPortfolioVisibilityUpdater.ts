import {PortfolioStatsEntity, portfolioStatsUpdater} from "../PortfolioStatsEntity";

const updatePortfolioVisibility = async (portfolioId:string, isPublic:boolean):Promise<PortfolioStatsEntity> => {
  return await portfolioStatsUpdater.updateAndReturn(portfolioId, {isPublic})
}

const makePortfolioPublic = (portfolioId:string) => {
  return updatePortfolioVisibility(portfolioId, true)
}

const makePortfolioPrivate = (portfolioId:string) => {
  return updatePortfolioVisibility(portfolioId, false)
}

export const publicPortfolioVisibilityUpdater = {
  makePortfolioPublic,
  makePortfolioPrivate,
}
