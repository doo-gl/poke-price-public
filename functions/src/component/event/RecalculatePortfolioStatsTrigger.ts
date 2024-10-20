import {eventCallback, EventTriggerCallback} from "./EventTriggerBuilder";
import {PublishRequest} from "./PublishRequest";
import {
  PortfolioStatsRecalculationRequest,
  portfolioStatsRecalculationSchema,
  portfolioStatsRecalculator,
} from "../domain/portfolio/PortfolioStatsRecalculator";

export type RecalculatePortfolioStatsPublishRequest = PublishRequest<'recalculate-portfolio-stats', PortfolioStatsRecalculationRequest>

export const RecalculatePortfolioStatsTrigger:EventTriggerCallback = eventCallback(
  async eventPayload => {
    await portfolioStatsRecalculator.recalculate(eventPayload.userId)
  },
  portfolioStatsRecalculationSchema
)

