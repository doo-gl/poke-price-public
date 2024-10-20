import {CardStatsEntityV2} from "./CardStatsEntityV2";
import {
  historicalCardStatsCreator,
  HistoricalCardStatsEntity,
  historicalCardStatsRepository,
} from "./HistoricalCardStatsEntity";
import {Create} from "../../../database/Entity";


const record = async (stats:Array<CardStatsEntityV2>):Promise<void> => {
  const creates:Array<Create<HistoricalCardStatsEntity>> = stats.map(stat => {
    return {
      statsId: stat.id,
      cardId: stat.cardId,
      selectionId: stat.selectionId,
      currencyCode: stat.currencyCode,
      condition: stat.condition,
      priceType: stat.priceType,
      periodSizeDays: stat.periodSizeDays,
      nextCalculationTime: stat.nextCalculationTime,
      stats: stat.stats,
      from: stat.from,
      to: stat.to,
      itemIds: stat.itemIds,
      lastCalculatedAt: stat.lastCalculatedAt,
    }
  })

  await historicalCardStatsRepository.batchCreate(creates)
}

export const historicalCardStatsRecorder = {
  record,
}