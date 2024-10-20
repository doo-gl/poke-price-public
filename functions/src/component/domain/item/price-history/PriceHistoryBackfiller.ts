import {historicalItemPriceRetriever} from "../historical-item-price/HistoricalItemPriceRetriever";
import moment from "moment";
import {ItemEntity, PriceType} from "../ItemEntity";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {
  pokemonTcgApiPriceHistoryRetriever,
} from "../../pokemon-tcg-api-v2/price-scraping/PokemonTcgApiPriceHistoryRetriever";
import {itemRetriever} from "../ItemRetriever";
import {currencyExchanger} from "../../money/CurrencyExchanger";
import {timestampToMoment} from "../../../tools/TimeConverter";
import {
  baseItemPriceHistoryCreator,
  baseItemPriceHistoryUpdater,
  ItemPriceHistoryContainer,
  ItemPriceHistoryEntity,
  ItemPriceHistoryState,
} from "./ItemPriceHistoryEntity";
import {Create, Update} from "../../../database/Entity";
import {TimestampStatic} from "../../../external-lib/Firebase";
import {itemPriceHistoryRetriever} from "./ItemPriceHistoryRetriever";
import {logger} from "firebase-functions";
import {FullItemPriceHistoryContext, itemPriceHistoryCalculator} from "./ItemPriceHistoryCalculator";

const getOrCreateHistory = async (itemId:string):Promise<ItemPriceHistoryEntity> => {
  const preExistingEntity = await itemPriceHistoryRetriever.retrieveForItem(itemId)
  if (preExistingEntity) {
    return preExistingEntity
  }
  const create:Create<ItemPriceHistoryEntity> = {
    itemId,
    state: ItemPriceHistoryState.NOT_CALCULATED,
    lastBackfilled: null,
    startedBackfillAt: null,
    fourteenDayGbpEbaySales: {currencyCode: CurrencyCode.GBP, prices: []},
    fourteenDayUsdEbaySales: {currencyCode: CurrencyCode.USD, prices: []},
    ninetyDayGbpEbaySales: {currencyCode: CurrencyCode.GBP, prices: []},
    ninetyDayUsdEbaySales: {currencyCode: CurrencyCode.USD, prices: []},
    tcgPlayerGbp: {currencyCode: CurrencyCode.GBP, prices: []},
    tcgPlayerUsd: {currencyCode: CurrencyCode.USD, prices: []},
    cardmarketGbp: {currencyCode: CurrencyCode.GBP, prices: []},
    cardmarketUsd: {currencyCode: CurrencyCode.USD, prices: []},
  }
  return await baseItemPriceHistoryCreator.create(create)
}

const startBackfill = async (itemPriceHistory:ItemPriceHistoryEntity, check?:boolean):Promise<ItemPriceHistoryEntity> => {
  if (check && !canStartBackfill(itemPriceHistory)) {
    return itemPriceHistory
  }
  const update:Update<ItemPriceHistoryEntity> = {
    startedBackfillAt: TimestampStatic.now(),
    state: ItemPriceHistoryState.CALCULATING,
  }
  return await baseItemPriceHistoryUpdater.updateAndReturn(itemPriceHistory.id, update)
}

const finishBackfill = async (itemPriceHistory:ItemPriceHistoryEntity, newHistory:ItemPriceHistoryContainer):Promise<ItemPriceHistoryEntity> => {
  const update:Update<ItemPriceHistoryEntity> = {
    startedBackfillAt: null,
    lastBackfilled: TimestampStatic.now(),
    state: ItemPriceHistoryState.CALCULATED,
    fourteenDayGbpEbaySales: newHistory.fourteenDayGbpEbaySales,
    fourteenDayUsdEbaySales: newHistory.fourteenDayUsdEbaySales,
    ninetyDayGbpEbaySales: newHistory.ninetyDayGbpEbaySales,
    ninetyDayUsdEbaySales: newHistory.ninetyDayUsdEbaySales,
    tcgPlayerGbp: newHistory.tcgPlayerGbp,
    tcgPlayerUsd: newHistory.tcgPlayerUsd,
    cardmarketGbp: newHistory.cardmarketGbp,
    cardmarketUsd: newHistory.cardmarketUsd,
  }
  return await baseItemPriceHistoryUpdater.updateAndReturn(itemPriceHistory.id, update)
}

const canStartBackfill = (itemPriceHistory:ItemPriceHistoryEntity):boolean => {
  const isNotCalculating = itemPriceHistory.state !== ItemPriceHistoryState.CALCULATING
  const isTimedOut = !!itemPriceHistory.startedBackfillAt
    && timestampToMoment(itemPriceHistory.startedBackfillAt).isBefore(moment().subtract(5, 'minute'))
  return isNotCalculating || isTimedOut
}

const buildBackfillContext = async (item:ItemEntity, itemPriceHistory:ItemPriceHistoryEntity):Promise<FullItemPriceHistoryContext> => {
  const cutoff = moment().subtract(360, 'days')
  const gbpEbaySales = (await historicalItemPriceRetriever.retrievePricesFromTime(cutoff, {
    itemId: item._id.toString(),
    priceType: PriceType.SALE,
    currencyCode: CurrencyCode.GBP,
    modificationKey: null,
  }))
    .filter(sale => sale.currenciesUsed?.every(curr => curr === CurrencyCode.GBP))
  const usdEbaySales = (await historicalItemPriceRetriever.retrievePricesFromTime(cutoff, {
    itemId: item._id.toString(),
    priceType: PriceType.SALE,
    currencyCode: CurrencyCode.USD,
    modificationKey: null,
  }))
    .filter(sale => sale.currenciesUsed?.every(curr => curr === CurrencyCode.USD))

  const tcgApiPriceHistory = await pokemonTcgApiPriceHistoryRetriever.retrieveForItemIdAfterTime(item._id.toString(), cutoff)

  const currencyExchangeTimestamps = tcgApiPriceHistory.map(histPrice => timestampToMoment(histPrice.timestamp))
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

  return {
    item,
    itemPriceHistory,
    gbpEbaySales,
    usdEbaySales,
    tcgApiPriceHistory,
    gbpExchanger,
    usdExchanger,
  }
}

const backfill = async (itemId:string):Promise<void> => {

  // when to trigger backfill
  // - do not want to backfill every single card
  // - add a specific endpoint for triggering backfill
  //    - if already backfilled - do nothing
  //    - if not backfilled, emit event that triggers a background backfill job
  // - add a second endpoint for retrieving price history
  //    - include the history calculation state, while it is calculating, keep showing loading spinner

  const item = await itemRetriever.retrieveByIdOrLegacyId(itemId)
  let itemPriceHistory = await getOrCreateHistory(item._id.toString())
  if (!canStartBackfill(itemPriceHistory)) {
    logger.info(`Cannot start backfill for history: ${itemPriceHistory.id}, state: ${itemPriceHistory.state}, backfill start at: ${itemPriceHistory.startedBackfillAt?.toDate().toISOString()}`)
    return
  }

  itemPriceHistory = await startBackfill(itemPriceHistory, true)

  const context = await buildBackfillContext(item, itemPriceHistory)
  const itemPriceHistoryContainer = itemPriceHistoryCalculator.calculateFull(context)

  itemPriceHistory = await finishBackfill(itemPriceHistory, itemPriceHistoryContainer)

}

const redoBackfill = async (itemId:string):Promise<void> => {
  const item = await itemRetriever.retrieveByIdOrLegacyId(itemId)
  let itemPriceHistory = await getOrCreateHistory(item._id.toString())

  itemPriceHistory = await startBackfill(itemPriceHistory)

  const context = await buildBackfillContext(item, itemPriceHistory)
  const itemPriceHistoryContainer = itemPriceHistoryCalculator.calculateFull(context)

  itemPriceHistory = await finishBackfill(itemPriceHistory, itemPriceHistoryContainer)
}

export const priceHistoryBackfiller = {
  backfill,
  canStartBackfill,
  redoBackfill,
}