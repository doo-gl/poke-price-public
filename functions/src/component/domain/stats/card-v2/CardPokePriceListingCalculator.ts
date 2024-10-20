import {CardStatsEntityV2} from "./CardStatsEntityV2";
import {NO_POKE_PRICE_INFO, PokePriceInfo} from "./CardPokePriceUpdater";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {PriceType} from "./CardPriceSelectionEntity";
import {CardCondition} from "../../historical-card-price/CardCondition";
import {BY_COUNT_DESC, cardPokePriceSoldCalculator} from "./CardPokePriceSoldCalculator";


const calculate = async (preferredCurrency:CurrencyCode, cardStats:Array<CardStatsEntityV2>):Promise<PokePriceInfo> => {
  if (cardStats.length === 0) {
    return NO_POKE_PRICE_INFO;
  }

  const preferredStats = cardStats.filter(cardStat =>
    cardStat.priceType === PriceType.LISTING_PRICE
    && cardStat.periodSizeDays >= 0 && cardStat.periodSizeDays <= 2
    && cardStat.currencyCode === preferredCurrency
    && cardStat.condition === CardCondition.NEAR_MINT
    && cardStat.stats.count > 0,
  )
    .sort(BY_COUNT_DESC)
    .find(() => true)

  if (preferredStats) {
    return await cardPokePriceSoldCalculator.mapStatsToInfo(preferredStats);
  }

  const longerViewStats = cardStats.filter(cardStat =>
    cardStat.priceType === PriceType.LISTING_PRICE
    && cardStat.periodSizeDays >= 0 && cardStat.periodSizeDays <= 20
    && cardStat.currencyCode === preferredCurrency
    && cardStat.condition === CardCondition.NEAR_MINT
    && cardStat.stats.count > 3,
  )
    .sort(BY_COUNT_DESC)
    .find(() => true)

  if (longerViewStats) {
    return await cardPokePriceSoldCalculator.mapStatsToInfo(longerViewStats);
  }

  const nearMintInAnyCurrencyStats = cardStats.filter(cardStat =>
    cardStat.priceType === PriceType.LISTING_PRICE
    && cardStat.periodSizeDays >= 0 && cardStat.periodSizeDays <= 20
    && cardStat.condition === CardCondition.NEAR_MINT
    && cardStat.stats.count > 0
  )

  if (nearMintInAnyCurrencyStats.length > 0) {
    return await cardPokePriceSoldCalculator.combineStatsToInfo(preferredCurrency, nearMintInAnyCurrencyStats);
  }

  const anyConditionAnyCurrencyStats = cardStats.filter(cardStat =>
    cardStat.priceType === PriceType.LISTING_PRICE
    && cardStat.periodSizeDays >= 0 && cardStat.periodSizeDays <= 20
    && cardStat.stats.count > 0
  )
  if (anyConditionAnyCurrencyStats.length > 0) {
    return await cardPokePriceSoldCalculator.combineStatsToInfo(preferredCurrency, anyConditionAnyCurrencyStats);
  }

  return NO_POKE_PRICE_INFO;
}

export const cardPokePriceListingCalculator = {
  calculate,
}