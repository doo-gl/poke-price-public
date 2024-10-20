import {UserEntity} from "../user/UserEntity";
import {timestampToMoment} from "../../tools/TimeConverter";
import moment from "moment/moment";
import {portfolioStatsRefreshRequester} from "./PortfolioStatsRefreshRequester";
import {cardOwnershipRetriever} from "../card-ownership/CardOwnershipRetriever";
import {portfolioStatsGetserter} from "./PortfolioStatsGetserter";


const onSessionStarted = async (user:UserEntity):Promise<void> => {
  const hasOwnerships = await cardOwnershipRetriever.hasOwnerships(user.id)
  if (!hasOwnerships) {
    return
  }
  const stats = await portfolioStatsGetserter.getOrCreatePortfolioStats(user)
  if (stats && stats.lastUpdate && timestampToMoment(stats.lastUpdate).isAfter(moment().subtract(1, 'day'))) {
    return
  }
  await portfolioStatsRefreshRequester.request(user.id)
}

export const portfolioRefreshOnUserSessionStartedHandler = {
  onSessionStarted,
}