import {cardStatsRetrieverV2} from "./CardStatsRetriever";
import {Price, statsPriceRetriever} from "./StatsPriceRetriever";
import {statsCalculator} from "./StatsCalculator";
import {CardStatsEntityV2, cardStatsRepository, cardStatsUpdater} from "./CardStatsEntityV2";
import {Moment} from "moment";
import moment from "moment/moment";
import {CurrencyAmountLike} from "../../money/CurrencyAmount";
import {momentToTimestamp} from "../../../tools/TimeConverter";
import {historicalCardStatsRecorder} from "./HistoricalCardStatsRecorder";
import {nextCardStatsCalculationTimeCalculator} from "./NextCardStatsCalculationTimeCalculator";
import {cardPriceSelectionRetriever} from "./CardPriceSelectionRetriever";
import {logger} from "firebase-functions";
import {CardPriceSelectionEntity, PriceType} from "./CardPriceSelectionEntity";
import {ebayCardSearchParamCreator} from "../../ebay/search-param/EbayCardSearchParamCreator";
import {cardPriceSelectionGenerator} from "./CardPriceSelectionGenerator";
import {cardPokePriceNextCalculationUpdater} from "./CardPokePriceNextCalculationUpdater";
import {BatchUpdate} from "../../../database/BaseCrudRepository";
import {dedupe} from "../../../tools/ArrayDeduper";
import {toInputValueMap} from "../../../tools/MapBuilder";
import {bulkPriceStatSelectionStateConsistencyProcessor} from "./BulkPriceStatSelectionStateConsistencyProcessor";
import {TimestampStatic} from "../../../external-lib/Firebase";
import {cardItemRetriever} from "../../item/CardItemRetriever";
import {itemUpdater, legacyIdOrFallback} from "../../item/ItemEntity";
import {cardStatsUpdateCalculator} from "./CardStatsUpdateCalculator";

// interface UpdateInfo {
//   itemIds:Array<string>,
//   from:Moment,
//   to:Moment,
//   prices:Array<CurrencyAmountLike>,
// }
//
// const calculateUpdateInfo = (itemPrices:Array<Price>):UpdateInfo => {
//   const itemIds:Array<string> = [];
//   let from:Moment = moment();
//   let to:Moment = moment();
//   const prices:Array<CurrencyAmountLike> = [];
//
//   itemPrices.forEach((itemPrice:Price, index:number) => {
//     const isFirst = index === 0;
//     const isLast = index === itemPrices.length - 1;
//     if (isFirst) {
//       from = itemPrice.timestamp;
//     }
//     if (isLast) {
//       to = itemPrice.timestamp;
//     }
//     itemIds.push(itemPrice.id);
//     prices.push(itemPrice.price);
//   })
//
//   return {
//     itemIds,
//     from,
//     to,
//     prices,
//   }
// }

const calculate = async (statsId:string):Promise<void> => {
  const cardStats = await cardStatsRetrieverV2.retrieve(statsId);
  await calculateForStats(cardStats)
}

const getOrCreateSelection = async (cardStats:CardStatsEntityV2):Promise<CardPriceSelectionEntity> => {
  const selection = await cardPriceSelectionRetriever.retrieveOptional(cardStats.selectionId);
  if (selection) {
    return selection
  }
  const searchParams = await ebayCardSearchParamCreator.getOrCreateSearchParams(cardStats.cardId);
  const createdSelection = await cardPriceSelectionGenerator.createSelection(searchParams, cardStats.priceType, cardStats.condition, cardStats.currencyCode);
  const updatedCardStats = await cardStatsUpdater.update(cardStats.id, { selectionId: createdSelection.id });
  return createdSelection;
}

const getStatsForCalculation = async (cardId:string, priceType:PriceType):Promise<Array<CardStatsEntityV2>> => {
  const stats = await cardStatsRetrieverV2.retrieveByCardIdAndPriceType(cardId, priceType)
  const selectionIds = dedupe(stats.map(stat => stat.selectionId), i => i)
  const selections = await cardPriceSelectionRetriever.retrieveByIds(selectionIds)
  const selectionIdToSelection = toInputValueMap(selections, inp => inp.id)
  return await Promise.all(
    stats.map(async stat => {
      const selection = selectionIdToSelection.get(stat.selectionId)
      if (selection) {
        return stat
      }
      const searchParams = await ebayCardSearchParamCreator.getOrCreateSearchParams(stat.cardId);
      const createdSelection = await cardPriceSelectionGenerator.createSelection(searchParams, stat.priceType, stat.condition, stat.currencyCode);
      selectionIdToSelection.set(createdSelection.id, createdSelection)
      const updatedCardStats = await cardStatsUpdater.update(stat.id, { selectionId: createdSelection.id });
      return updatedCardStats;
    })
  )
}

const calculateForStats = async (cardStats:CardStatsEntityV2):Promise<void> => {
  const selection = await getOrCreateSelection(cardStats);
  if (!selection.hasReconciled) {
    logger.info(`Selection with id: ${selection.id} has not reconciled, not recalculating stats with id: ${cardStats.id} until it has`);
    await cardStatsUpdater.update(cardStats.id, { nextCalculationTime: momentToTimestamp(moment().add(1, 'hour')) });
    return;
  }

  const statsPrices = await statsPriceRetriever.retrievePrices(cardStats);

  const statUpdateDetails = cardStatsUpdateCalculator.calculate(statsPrices, cardStats.currencyCode)
  const rawItemStats = statUpdateDetails.rawItemStats
  const stats = rawItemStats.stats

  const nextCalculationTime = nextCardStatsCalculationTimeCalculator.calculateV2(cardStats, stats, statsPrices);

  const updatedCardStats = await cardStatsUpdater.update(cardStats.id, {
    nextCalculationTime: momentToTimestamp(nextCalculationTime),
    lastCalculatedAt: TimestampStatic.now(),
    from: momentToTimestamp(rawItemStats.from),
    to: momentToTimestamp(rawItemStats.to),
    itemIds: rawItemStats.priceIds,
    stats,
    modificationKeys: statUpdateDetails.modificationKeys,
    modificationStats: statUpdateDetails.modificationStats,
  });

  // await historicalCardStatsRecorder.record([updatedCardStats]);
  await cardPokePriceNextCalculationUpdater.onStatsUpdated([updatedCardStats]);
}

const calculateForPriceType = async (cardId:string, priceType:PriceType) => {
  const processResult = await bulkPriceStatSelectionStateConsistencyProcessor.process(cardId, priceType)
  const allPrices = processResult.statPrices;
  const stats = processResult.stats

  // group prices by the selections they are part of
  const selectionIdToPrices = new Map<string, Array<Price>>()
  allPrices.prices.forEach(price => {
    price.selectionIds.forEach(selectionId => {
      const pricesForSelection = selectionIdToPrices.get(selectionId) ?? []
      pricesForSelection.push(price)
      selectionIdToPrices.set(selectionId, pricesForSelection)
    })
  })

  // iterate through stats, using map to select price, calculating stats,
  const statsUpdates:Array<BatchUpdate<CardStatsEntityV2>> = []
  stats.forEach(stat => {
    const prices = selectionIdToPrices.get(stat.selectionId) ?? []
    const statsPrices = priceType === PriceType.SOLD_PRICE
      ? statsPriceRetriever.mapSoldPricesToStatPrices(prices, stat.periodSizeDays)
      : statsPriceRetriever.mapListingPricesToStatPrices(prices, stat.periodSizeDays)

    const statUpdateDetails = cardStatsUpdateCalculator.calculate(statsPrices, stat.currencyCode)
    const rawItemStats = statUpdateDetails.rawItemStats
    const newStats = rawItemStats.stats

    const nextCalculationTime = nextCardStatsCalculationTimeCalculator.calculateV2(stat, newStats, statsPrices);
    statsUpdates.push({
      id: stat.id,
      update: {
        nextCalculationTime: momentToTimestamp(nextCalculationTime),
        lastCalculatedAt: TimestampStatic.now(),
        from: momentToTimestamp(rawItemStats.from),
        to: momentToTimestamp(rawItemStats.to),
        itemIds: rawItemStats.priceIds,
        stats: newStats,
        modificationKeys: statUpdateDetails.modificationKeys,
        modificationStats: statUpdateDetails.modificationStats,
      },
    })
  })
  await cardStatsRepository.batchUpdate(statsUpdates)
  const updatedStats = await cardStatsRetrieverV2.retrieveByIds(statsUpdates.map(upd => upd.id))
  // await historicalCardStatsRecorder.record(updatedStats);
  await cardPokePriceNextCalculationUpdater.onStatsUpdated(updatedStats);
}

const calculateForCard =  async (cardId:string):Promise<void> => {

  try {
    const card = await cardItemRetriever.retrieve(cardId)
    const itemId = legacyIdOrFallback(card)
    await Promise.all([
      calculateForPriceType(itemId, PriceType.SOLD_PRICE),
      calculateForPriceType(itemId, PriceType.LISTING_PRICE),
    ])

    const nextUpdate = nextCardStatsCalculationTimeCalculator.calculateV3(card)
    await itemUpdater.updateOnly(card._id, {
      nextStatsCalculationTime: nextUpdate.toDate(),
    })
  } catch (err:any) {
    logger.error(`Failed to update stats for card: ${cardId}, ${err.message}`, err)
    const card = await cardItemRetriever.retrieve(cardId)
    await itemUpdater.updateOnly(card._id, {
      nextStatsCalculationTime: moment().add(1, 'day').toDate(),
    })
  }

}

export const cardStatsCalculator = {
  calculate,
  calculateForStats,
  calculateForCard,
}