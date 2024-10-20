import {CardPriceStatsEntity} from "../card/CardPriceStatsEntity";
import {CurrencyAmountLike, fromCurrencyAmountLike, Zero} from "../../money/CurrencyAmount";
import {Moment} from "moment";
import {timestampToMoment} from "../../../tools/TimeConverter";
import {SetEntity} from "../../set/SetEntity";
import {cardPriceStatsRetriever} from "../card/CardPriceStatsRetriever";
import {CurrencyCode} from "../../money/CurrencyCodes";

export interface SetStats {
  mostRecentPrice:Moment,
  totalSetPokePrice:CurrencyAmountLike,
}

const extractCurrencyCode = (cardStats:Array<CardPriceStatsEntity>):CurrencyCode|null => {
  for (let statsIndex = 0; statsIndex < cardStats.length; statsIndex++) {
    const cardStat = cardStats[statsIndex];
    if (cardStat.pokePriceStats && cardStat.pokePriceStats.mean) {
      return cardStat.pokePriceStats.mean.currencyCode;
    }
  }
  return null;
}

const calculate = (cardStats:Array<CardPriceStatsEntity>):SetStats|null => {
  if (!cardStats || cardStats.length === 0) {
    return null;
  }
  const currencyCode = extractCurrencyCode(cardStats);
  if (!currencyCode) {
    return null;
  }
  const zero = Zero(currencyCode);
  let totalSetPokePrice = zero;
  let mostRecentPrice:Moment = timestampToMoment(cardStats[0].mostRecentPrice);
  cardStats.forEach(cardStat => {

    if (!cardStat.pokePriceStats) {
      return;
    }
    const pokePrice = cardStat.pokePriceStats.median;
    const mostRecentCardPrice:Moment = timestampToMoment(cardStat.mostRecentPrice);
    if (fromCurrencyAmountLike(pokePrice).greaterThan(zero)) {
      totalSetPokePrice = fromCurrencyAmountLike(totalSetPokePrice).add(fromCurrencyAmountLike(pokePrice));
    }
    if (mostRecentCardPrice.isAfter(mostRecentPrice)) {
      mostRecentPrice = mostRecentCardPrice;
    }
  })
  return {
    mostRecentPrice,
    totalSetPokePrice: totalSetPokePrice.toCurrencyAmountLike(),
  }
}

const calculateForSet = async (set:SetEntity):Promise<SetStats|null> => {
  const cardStats:Array<CardPriceStatsEntity> = await cardPriceStatsRetriever.retrieveStatsForSet({ series: set.series, set: set.name });
  if (cardStats.length === 0) {
    return null;
  }
  const setStats:SetStats|null = setPriceStatsCalculator.calculate(cardStats);
  return setStats;
}

export const setPriceStatsCalculator = {
  calculate,
  calculateForSet,
}