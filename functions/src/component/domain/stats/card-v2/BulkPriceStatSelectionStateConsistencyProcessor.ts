import {CardPriceSelectionEntity, PriceType} from "./CardPriceSelectionEntity";
import {CardStatsEntityV2} from "./CardStatsEntityV2";
import {bulkMissingStatSelectionCreator} from "./BulkMissingStatSelectionCreator";
import {bulkPriceReconciler} from "./BulkPriceReconciler";
import {cardPriceSelectionRetriever} from "./CardPriceSelectionRetriever";
import {cardStatsRetrieverV2} from "./CardStatsRetriever";
import {statsPriceRetriever, StatsPrices} from "./StatsPriceRetriever";

export interface ProcessResult {
  selections:Array<CardPriceSelectionEntity>,
  stats:Array<CardStatsEntityV2>,
  statPrices:StatsPrices
}

const process = async (cardId:string, priceType:PriceType):Promise<ProcessResult> => {
  const stats = await cardStatsRetrieverV2.retrieveByCardIdAndPriceType(cardId, priceType)
  const statsPrices = await statsPriceRetriever.retrieveByCardIdAndPriceTypeForStats(cardId, priceType, stats)
  const prices = statsPrices.prices
  const selections = await cardPriceSelectionRetriever.retrieveForCardIdAndPriceType(cardId, priceType)
  const createResult = await bulkMissingStatSelectionCreator.create(cardId, prices, selections, stats)
  const reconciledPrices = await bulkPriceReconciler.reconcile(prices, createResult.selections)
  return {
    statPrices: {
      prices: reconciledPrices,
      nextPriceAfterTimeBound: statsPrices.nextPriceAfterTimeBound,
    },
    selections: createResult.selections,
    stats: createResult.stats,
  }
}

export const bulkPriceStatSelectionStateConsistencyProcessor = {
  process,
}