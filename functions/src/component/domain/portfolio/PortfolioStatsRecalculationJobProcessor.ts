import {logger} from "firebase-functions";
import {portfolioStatsRepository} from "./PortfolioStatsEntity";
import {portfolioStatsRefreshRequester} from "./PortfolioStatsRefreshRequester";
import {TimestampStatic} from "../../external-lib/Firebase";


const process = async () => {

  await portfolioStatsRepository.iterator()
    .queries([
      { field: 'nextUpdate', operation: '<=', value: TimestampStatic.now() },
    ])
    .batchSize(10)
    .iterate(async entity => {
      logger.info(`Refreshing portfolio stats for user: ${entity.userId}.`)
      await portfolioStatsRefreshRequester.request(entity.userId);
    })

}

export const portfolioStatsRecalculationJobProcessor = {
  process,
}
