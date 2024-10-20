import {CurrencyCode} from "../../money/CurrencyCodes";
import {cardStatsRetrieverV2} from "./CardStatsRetriever";
import {CurrencyAmountLike} from "../../money/CurrencyAmount";
import {Moment} from "moment";
import {cardPokePriceSoldCalculator} from "./CardPokePriceSoldCalculator";
import {cardPokePriceListingCalculator} from "./CardPokePriceListingCalculator";
import moment from "moment/moment";
import {cardStatsUniquenessEnforcer} from "./CardStatsUniquenessEnforcer";
import {ItemEntity, ItemPriceDetails, ItemPrices, itemUpdater, PriceType as ItemPriceType} from "../../item/ItemEntity";
import {cardItemRetriever} from "../../item/CardItemRetriever";
import {PriceType} from "./CardPriceSelectionEntity";
import {historicalItemPriceRecorder} from "../../item/historical-item-price/HistoricalItemPriceRecorder";
import {itemPriceHistoryCalculator} from "../../item/ItemPriceHistoryCalculator";
import {CardStatsEntityV2} from "./CardStatsEntityV2";
import {itemPriceDetailsCalculator} from "./v2-2/ItemPriceDetailsCalculator";
import {pokePriceMapper} from "./v2-2/PokePriceMapper";

const PREFERRED_CURRENCY = CurrencyCode.GBP;
const SUPPORTED_CURRENCIES = [CurrencyCode.GBP, CurrencyCode.USD]

export interface PokePriceInfo {
  price:CurrencyAmountLike|null,
  volume:number|null,
  periodSizeDays:number|null,
  minPrice:CurrencyAmountLike|null,
  lowPrice:CurrencyAmountLike|null,
  highPrice:CurrencyAmountLike|null,
  maxPrice:CurrencyAmountLike|null,
  lastUpdatedAt:Moment|null,
  mostRecentPrice:Moment|null,
  statIds:Array<string>|null,
}

export const NO_POKE_PRICE_INFO:PokePriceInfo = {
  minPrice: null,
  lowPrice: null,
  price: null,
  highPrice: null,
  maxPrice: null,
  volume: null,
  periodSizeDays: null,
  lastUpdatedAt: null,
  mostRecentPrice: null,
  statIds: null,
}

const calculateNewItemPriceDetailsV1 = async (itemId:string, itemPriceStats:Array<CardStatsEntityV2>):Promise<Array<ItemPriceDetails>> => {
  const soldCardStats = itemPriceStats.filter(itemStat => itemStat.priceType === PriceType.SOLD_PRICE);
  const soldInfo = await cardPokePriceSoldCalculator.calculate(itemId, PREFERRED_CURRENCY, soldCardStats);

  const listingCardStats = itemPriceStats.filter(itemStat => itemStat.priceType === PriceType.LISTING_PRICE);
  const listingInfo = await cardPokePriceListingCalculator.calculate(PREFERRED_CURRENCY, listingCardStats);

  const newSoldItemPriceDetails:ItemPriceDetails = {
    currencyCode: PREFERRED_CURRENCY,
    priceType: ItemPriceType.SALE,
    minPrice: soldInfo.minPrice,
    lowPrice: soldInfo.lowPrice,
    price: soldInfo.price,
    highPrice: soldInfo.highPrice,
    maxPrice: soldInfo.maxPrice,
    volume: soldInfo.volume,
    periodSizeDays: soldInfo.periodSizeDays,
    statIds: soldInfo.statIds,
    lastUpdatedAt: soldInfo.lastUpdatedAt?.toDate() ?? null,
    mostRecentPrice: soldInfo.mostRecentPrice?.toDate() ?? null,
    currenciesUsed: [PREFERRED_CURRENCY],
  }
  const newListingItemPriceDetails:ItemPriceDetails = {
    currencyCode: PREFERRED_CURRENCY,
    priceType: ItemPriceType.LISTING,
    minPrice: listingInfo.minPrice,
    lowPrice: listingInfo.lowPrice,
    price: listingInfo.price,
    highPrice: listingInfo.highPrice,
    maxPrice: listingInfo.maxPrice,
    volume: listingInfo.volume,
    periodSizeDays: listingInfo.periodSizeDays,
    statIds: listingInfo.statIds,
    lastUpdatedAt: listingInfo.lastUpdatedAt?.toDate() ?? null,
    mostRecentPrice: listingInfo.mostRecentPrice?.toDate() ?? null,
    currenciesUsed: [PREFERRED_CURRENCY],
  }
  return [newSoldItemPriceDetails, newListingItemPriceDetails]
}

const calculateNewItemPriceDetailsV2 = async (item:ItemEntity, itemPriceStats:Array<CardStatsEntityV2>):Promise<ItemPrices> => {
  return itemPriceDetailsCalculator.calculate(
    item,
    SUPPORTED_CURRENCIES,
    itemPriceStats
  )
}

const update = async (cardId:string):Promise<void> => {
  const card = await cardItemRetriever.retrieve(cardId)
  const cardStats = await cardStatsRetrieverV2.retrieveForCardId(card.legacyId ?? card._id.toString());
  const uniqueStats = await cardStatsUniquenessEnforcer.enforce(cardStats)

  // const newItemPriceDetails = await calculateNewItemPriceDetailsV1(cardId, uniqueStats)
  const newItemPrices = await calculateNewItemPriceDetailsV2(card, uniqueStats)
  const pokePrices = SUPPORTED_CURRENCIES.map(currencyCode => pokePriceMapper.map(newItemPrices, currencyCode, card.pokePriceOverrides))

  const newHistory = itemPriceHistoryCalculator.calculate(card, newItemPrices)

  // update the poke price for a card at least once per week
  // if stats that make up the poke price are updated then this calculation time might be brought forward
  const nextCalculationTime = moment().add(7, 'days')

  await Promise.all([
    historicalItemPriceRecorder.record(card, newItemPrices),
    itemUpdater.updateOnly(
      card._id, {
        pokePrices,
        itemPrices: newItemPrices,
        itemPriceHistory: newHistory,
        nextPokePriceCalculationTime: nextCalculationTime.toDate(),
      }),
  ])
}

export const cardPokePriceUpdater = {
  update,
}