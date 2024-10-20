import {logger} from "firebase-functions";
import {eventPublisher} from "../../event/EventPublisher";
import {RecalculatePortfolioStatsPublishRequest} from "../../event/RecalculatePortfolioStatsTrigger";


const request = async (userId:string) => {
  logger.info(`Requested portfolio stat refresh for user: ${userId}`)
  const publishRequest:RecalculatePortfolioStatsPublishRequest = {
    topicName: "recalculate-portfolio-stats",
    data: {userId},
  }
  await eventPublisher.publish(publishRequest)
}

export const portfolioStatsRefreshRequester = {
  request,
}