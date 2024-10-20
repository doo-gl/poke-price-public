import {cardRankingCalculator, RankingRequest} from "./CardRankingCalculator";
import {CardRankingEntity} from "./CardRankingEntity";
import {baseCardRankingCreator, baseCardRankingUpdater} from "./CardRankingRepository";
import {cardRankingRetriever} from "./CardRankingRetriever";
import {momentToTimestamp} from "../../tools/TimeConverter";

const rank = async (request:RankingRequest):Promise<CardRankingEntity> => {
  const rankingResponse = await cardRankingCalculator.calculate(request);
  // check for the most recent ranking with the same key
  // update that most recent to not be the most recent, add this one as most recent
  const recentRankings = await cardRankingRetriever.retrieveMostRecentForKey(rankingResponse.key);
  if (recentRankings.length > 0) {
    await Promise.all(
      recentRankings.map(ranking => baseCardRankingUpdater.update(ranking.id, {isMostRecent: false}))
    );
  }
  const createdRanking = await baseCardRankingCreator.create({
    isMostRecent: true,
    cardIds: rankingResponse.cardIds,
    key: rankingResponse.key,
    metric: rankingResponse.metric,
    dimensions: rankingResponse.dimensions,
    timestamp: momentToTimestamp(rankingResponse.timestamp),
    rankedCards: rankingResponse.rankedCards,
  });
  return createdRanking;
}

export const cardRanker = {
  rank,
}