import {HistoricalItemPriceEntity} from "../historical-item-price/HistoricalItemPriceEntity";
import {PokemonTcgApiPriceHistoryEntity} from "../../pokemon-tcg-api-v2/price-scraping/PokemonTcgApiPriceHistoryEntity";
import {ItemEntity, PriceType} from "../ItemEntity";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {
  baseItemPriceHistoryUpdater,
  ItemPriceHistory,
  ItemPriceHistoryEntity,
  ItemPriceHistoryPoint,
} from "./ItemPriceHistoryEntity";
import {comparatorBuilder} from "../../../infrastructure/ComparatorBuilder";
import {timestampToMoment} from "../../../tools/TimeConverter";
import {itemPriceHistoryRetriever} from "./ItemPriceHistoryRetriever";
import {logger} from "firebase-functions";
import {Create, Update} from "../../../database/Entity";
import {itemPriceHistoryCalculator} from "./ItemPriceHistoryCalculator";
import {currencyExchanger} from "../../money/CurrencyExchanger";

const mergeNewDataPoints = (currentData:ItemPriceHistory, newData:Array<ItemPriceHistoryPoint>):ItemPriceHistory => {
  const mergedData = new Array<ItemPriceHistoryPoint>()
  const sortedCurrentData = currentData.prices
    .slice().sort(comparatorBuilder.objectAttributeASC(val => val.timestamp.toDate().getTime()))
  const sortedNewData = newData
    .slice().sort(comparatorBuilder.objectAttributeASC(val => val.timestamp.toDate().getTime()))

  let currentDataIndex = 0
  let newDataIndex = 0
  while (currentDataIndex < sortedCurrentData.length || newDataIndex < sortedNewData.length) {
    const currentDatum = sortedCurrentData[currentDataIndex]
    const newDatum = sortedNewData[newDataIndex]

    if (!currentDatum && !newDatum) {
      currentDataIndex++
      newDataIndex++
      continue;
    }
    if (!currentDatum) {
      mergedData.push(newDatum)
      newDataIndex++
      continue
    }
    if (!newDatum) {
      mergedData.push(currentDatum)
      currentDataIndex++
      continue
    }

    const currentTimestamp = timestampToMoment(currentDatum.timestamp).startOf("day")
    const newTimestamp = timestampToMoment(newDatum.timestamp).startOf("day")

    if (currentTimestamp.isSame(newTimestamp)) {
      // in the case of equal timestamps, use the new version
      mergedData.push(newDatum)
      currentDataIndex++
      newDataIndex++
      continue;
    }

    // res,  curr,    new
    // [], [1,2,4], [0,2,3,5] => start
    // [0], [1,2,4], [2,3,5] => take new as 1 > 0, move new forward
    // [0,1], [2,4], [2,3,5] => take current as 1 < 2, move current forward
    // [0,1,2], [4], [3,5] => take new as 2 = 2, move current and new forward
    // [0,1,2,3], [4], [5] => take new as 4 > 3, move new forward
    // [0,1,2,3,4], [], [5] => take current as 4 < 5, move current forward
    // [0,1,2,3,4,5], [], [] => take new as current undefined, move new forward
    // end as both lists have been traversed

    if (currentTimestamp.isBefore(newTimestamp)) {
      mergedData.push(currentDatum)
      currentDataIndex++
    } else {
      mergedData.push(newDatum)
      newDataIndex++
    }
  }

  return {
    currencyCode: currentData.currencyCode,
    prices: mergedData,
  }
}

const onNewHistoricItemPrices = async (item:ItemEntity, newHistoricPrices:Array<HistoricalItemPriceEntity|Create<HistoricalItemPriceEntity>>):Promise<void> => {

  const itemPriceHistory = await itemPriceHistoryRetriever.retrieveForItem(item._id.toString())
  if (!itemPriceHistory) {
    logger.info(`Did not find item price history for item: ${item._id.toString()}, not updating`)
    return
  }

  const fourteenDayGbp = newHistoricPrices.filter(prc =>
    prc.priceType === PriceType.SALE
    && prc.currencyCode === CurrencyCode.GBP
    && prc.periodSizeDays === 14
    && prc.modificationKey === null
  )
  const fourteenDayUsd = newHistoricPrices.filter(prc =>
    prc.priceType === PriceType.SALE
    && prc.currencyCode === CurrencyCode.USD
    && prc.periodSizeDays === 14
    && prc.modificationKey === null
  )
  const ninetyDayGbp = newHistoricPrices.filter(prc =>
    prc.priceType === PriceType.SALE
    && prc.currencyCode === CurrencyCode.GBP
    && prc.periodSizeDays === 90
    && prc.modificationKey === null
  )
  const ninetyDayUsd = newHistoricPrices.filter(prc =>
    prc.priceType === PriceType.SALE
    && prc.currencyCode === CurrencyCode.USD
    && prc.periodSizeDays === 90
    && prc.modificationKey === null
  )
  const isNoResult = [
    fourteenDayGbp,
    fourteenDayUsd,
    ninetyDayGbp,
    ninetyDayUsd,
  ]
    .every(list => list.length === 0)
  if (isNoResult) {
    logger.info(`No new item price history for item: ${item._id.toString()}, skipping`)
    return
  }

  const update:Update<ItemPriceHistoryEntity> = {
    fourteenDayGbpEbaySales: mergeNewDataPoints(itemPriceHistory.fourteenDayGbpEbaySales, fourteenDayGbp.map(itemPriceHistoryCalculator.mapHistoricalPriceEntity)),
    fourteenDayUsdEbaySales: mergeNewDataPoints(itemPriceHistory.fourteenDayUsdEbaySales, fourteenDayUsd.map(itemPriceHistoryCalculator.mapHistoricalPriceEntity)),
    ninetyDayGbpEbaySales: mergeNewDataPoints(itemPriceHistory.ninetyDayGbpEbaySales, ninetyDayGbp.map(itemPriceHistoryCalculator.mapHistoricalPriceEntity)),
    ninetyDayUsdEbaySales: mergeNewDataPoints(itemPriceHistory.ninetyDayUsdEbaySales, ninetyDayUsd.map(itemPriceHistoryCalculator.mapHistoricalPriceEntity)),
  }

  await baseItemPriceHistoryUpdater.updateOnly(itemPriceHistory.id, update)
}

const onNewTcgApiHistory = async (item:ItemEntity, newHistoryPrices:Array<PokemonTcgApiPriceHistoryEntity|Create<PokemonTcgApiPriceHistoryEntity>>):Promise<void> => {

  const itemPriceHistory = await itemPriceHistoryRetriever.retrieveForItem(item._id.toString())
  if (!itemPriceHistory) {
    // logger.info(`Did not find item price history for item: ${item._id.toString()}, not updating`)
    return
  }

  const currencyExchangeTimestamps = newHistoryPrices.map(histPrice => timestampToMoment(histPrice.timestamp))
  const gbpExchanger = await currencyExchanger.buildHistoricalExchanger(
    [CurrencyCode.USD, CurrencyCode.EUR],
    CurrencyCode.GBP,
    currencyExchangeTimestamps
  )
  const usdExchanger = await currencyExchanger.buildHistoricalExchanger(
    [CurrencyCode.EUR],
    CurrencyCode.USD,
    currencyExchangeTimestamps
  )

  const tcgPlayerGbp = mergeNewDataPoints(
    itemPriceHistory.tcgPlayerGbp,
    newHistoryPrices.map(newHistPrice => itemPriceHistoryCalculator.mapTcgPlayerToDataPoint(
      newHistPrice,
      item,
      itemPriceHistoryCalculator.createConverter(gbpExchanger)
    ))
  )
  const tcgPlayerUsd = mergeNewDataPoints(
    itemPriceHistory.tcgPlayerUsd,
    newHistoryPrices.map(newHistPrice => itemPriceHistoryCalculator.mapTcgPlayerToDataPoint(
      newHistPrice,
      item,
      itemPriceHistoryCalculator.createConverter(usdExchanger)
    ))
  )
  const cardmarketGbp = mergeNewDataPoints(
    itemPriceHistory.cardmarketGbp,
    newHistoryPrices.map(newHistPrice => itemPriceHistoryCalculator.mapCardMarketToDataPoint(
      newHistPrice,
      item,
      itemPriceHistoryCalculator.createConverter(gbpExchanger)
    ))
  )
  const cardmarketUsd = mergeNewDataPoints(
    itemPriceHistory.cardmarketUsd,
    newHistoryPrices.map(newHistPrice => itemPriceHistoryCalculator.mapCardMarketToDataPoint(
      newHistPrice,
      item,
      itemPriceHistoryCalculator.createConverter(usdExchanger)
    ))
  )

  const update:Update<ItemPriceHistoryEntity> = {
    tcgPlayerGbp,
    tcgPlayerUsd,
    cardmarketGbp,
    cardmarketUsd,
  }
  await baseItemPriceHistoryUpdater.updateOnly(itemPriceHistory.id, update)
}

export const priceHistoryUpdateHandler = {
  onNewHistoricItemPrices,
  onNewTcgApiHistory,
}