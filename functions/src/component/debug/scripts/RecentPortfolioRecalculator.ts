import {PortfolioStatsEntity, portfolioStatsRepository} from "../../domain/portfolio/PortfolioStatsEntity";
import {momentToTimestamp} from "../../tools/TimeConverter";
import moment from "moment";
import {portfolioStatsRecalculator} from "../../domain/portfolio/PortfolioStatsRecalculator";
import {logger} from "firebase-functions";

const recalculate = async (
  sinceDaysToRecalculate:number,
  shouldRecalculate:(portfolio:PortfolioStatsEntity) => boolean,
) => {
  await portfolioStatsRepository.iterator()
    .queries([
      {field: 'lastUpdate', operation: '>=', value: momentToTimestamp(moment().subtract(sinceDaysToRecalculate, 'days'))},
    ])
    .batchSize(10)
    .iterate(async portfolio => {
      if (!shouldRecalculate(portfolio)) {
        logger.info(`Not recalculating for portfolio: ${portfolio.id}`)
        return
      }
      logger.info(`Recalculating for portfolio: ${portfolio.id}`)
      await portfolioStatsRecalculator.recalculateForPortfolio(portfolio)
    })
}

export const recentPortfolioRecalculator = {
  recalculate,
}