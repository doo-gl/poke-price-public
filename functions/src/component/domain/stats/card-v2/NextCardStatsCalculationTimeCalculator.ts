import {CardStatsEntityV2, Stats} from "./CardStatsEntityV2";
import {Moment} from "moment";
import {PriceType} from "./CardPriceSelectionEntity";
import {UnexpectedError} from "../../../error/UnexpectedError";
import moment from "moment/moment";
import {StatsPrices} from "./StatsPriceRetriever";
import {timestampToMoment} from "../../../tools/TimeConverter";
import {CardEntity} from "../../card/CardEntity";
import {valueTagExtractor} from "../../card/query/ValueTagExtractor";
import {ItemEntity} from "../../item/ItemEntity";
import {itemValueTagExtractor} from "../../item/tag/ItemValueTagExtractor";

const calculateForSold = (cardStats:CardStatsEntityV2, newStats:Stats):Moment => {
  // want to have a function that returns a smaller period for larger numbers of sales
  // using a simple linear negative gradient
  // y = c - mx
  // period = (period when there are no sales) - (diff in period / diff in sales per unit period) * (sales per unit period)
  const salesPerDay = newStats.count / cardStats.periodSizeDays;
  const salesPerHour = salesPerDay / 24;
  const minSalesPerHour = 0;
  // shortest time between calculations is 8 hours
  // therefore max sales per hour is 3 per day or 3 per 24 hours (or 1 / 8)
  const maxSalesPerHour = 3 / 24;
  // based on current data, max a card sells is about 3 per day
  const minPeriodBetweenCalculationsInHours = 8;
  const maxPeriodBetweenCalculationsInHours = 24 * 7;
  const gradient =
    (maxPeriodBetweenCalculationsInHours - minPeriodBetweenCalculationsInHours)
      / (maxSalesPerHour - minSalesPerHour)

  const hours = maxPeriodBetweenCalculationsInHours - (salesPerHour * gradient)
  // if the hours land up being less than min because a card sells very well, limit it to the min period
  const periodHours = Math.max(minPeriodBetweenCalculationsInHours, hours)

  return moment().add(periodHours, 'hours')
}

const calculateForListings = (cardStats:CardStatsEntityV2, newStats:Stats):Moment => {
  // want to have a function that returns a smaller period for larger numbers of listings
  // using a simple linear negative gradient
  // y = c - mx
  // period = (period when there are no listings) - (diff in period / diff in listings per unit period) * (listings per unit period)
  const listingsPerDay = newStats.count / cardStats.periodSizeDays;
  const listingsPerHour = listingsPerDay / 24;
  const minSalesPerHour = 0;
  // shortest time between calculations is 8 hours
  // going to try 3 per day to see how that goes...
  const maxListingsPerHour = 3 / 24;
  const minPeriodBetweenCalculationsInHours = 8;
  const maxPeriodBetweenCalculationsInHours = 24 * 7;
  const gradient =
    (maxPeriodBetweenCalculationsInHours - minPeriodBetweenCalculationsInHours)
    / (maxListingsPerHour - minSalesPerHour)

  const hours = maxPeriodBetweenCalculationsInHours - (listingsPerHour * gradient)
  // if the hours land up being less than min because a card sells very well, limit it to the min period
  const periodHours = Math.max(minPeriodBetweenCalculationsInHours, hours)
  return moment().add(periodHours, 'hours')
}

const calculate = (cardStats:CardStatsEntityV2, newStats:Stats):Moment => {
  if (cardStats.priceType === PriceType.SOLD_PRICE) {
    return calculateForSold(cardStats, newStats);
  }
  if (cardStats.priceType === PriceType.LISTING_PRICE) {
    return calculateForListings(cardStats, newStats)
  }
  throw new UnexpectedError(`Unrecognised price type: ${cardStats.priceType} on stats: ${cardStats.id}`)
}

const calculateForListingsV2 = (cardStats:CardStatsEntityV2, newStats:Stats, statsPrice:StatsPrices):Moment => {
  // listings
  // - checking to see when a price has come in to the stats
  // - can't know this without looking at the future prices
  // - given a stats, find the next price that falls in front of the time bound,
  // - next calculation will be at this time
  // - if there is no next listing, check back in 4 weeks, unless something triggers this sooner
  if (!statsPrice.nextPriceAfterTimeBound) {
    return moment().add(4, 'weeks');
  }
  const endTimeBound = moment().add(cardStats.periodSizeDays, 'days')
  const differenceBetweenEndTimeBoundAndNextPriceMinutes = statsPrice.nextPriceAfterTimeBound.timestamp.diff(endTimeBound, 'minutes')
  if (differenceBetweenEndTimeBoundAndNextPriceMinutes <= 0) {
    return moment().add(4, 'weeks');
  }
  return moment().add(differenceBetweenEndTimeBoundAndNextPriceMinutes, 'minutes');
}

const calculateForSoldsV2 = (cardStats:CardStatsEntityV2, newStats:Stats, statsPrice:StatsPrices):Moment => {
  // solds
  // - checking to see when a price has fallen out the back of the time bound
  // - can be done based on the from date, the difference between the beginning of the time bound and the from date is the amount of time to wait
  // - the time until the first price in the time bound is the time at which the stats will change because a price has fallen outside
  // - if there is no prices, check back in 4 weeks, unless something triggers this sooner
  if (statsPrice.prices.length === 0) {
    return moment().add(4, 'weeks');
  }
  const firstPriceTime = statsPrice.prices[0].timestamp
  const startTimeBound = moment().subtract(cardStats.periodSizeDays, 'days')
  const differenceBetweenStartTimeBoundAndFirstPriceMinutes = firstPriceTime.diff(startTimeBound, 'minutes')
  if (differenceBetweenStartTimeBoundAndFirstPriceMinutes <= 0) {
    return moment().add(4, 'weeks');
  }
  return moment().add(differenceBetweenStartTimeBoundAndFirstPriceMinutes, 'minutes');
}

const calculateV2 = (cardStats:CardStatsEntityV2, newStats:Stats, statsPrice:StatsPrices):Moment => {
  // work out the time at which the stats should be next calculated
  // then throttle that so that we do at most one stat recalculation every day
  const nextCalculation = cardStats.priceType === PriceType.SOLD_PRICE
    ? calculateForSoldsV2(cardStats, newStats, statsPrice)
    : calculateForListingsV2(cardStats, newStats, statsPrice)

  const minimumAllowedNextCalculation = timestampToMoment(cardStats.lastCalculatedAt).add(24, 'hours')
  if (nextCalculation.isBefore(minimumAllowedNextCalculation)) {
    return minimumAllowedNextCalculation;
  } else {
    return nextCalculation;
  }
}

const calculateV3 = (card:ItemEntity):Moment => {
  const volume = itemValueTagExtractor.calculateTotalCirculation(card.itemPrices);

  if (!volume || volume < 10) {
    return moment().add(10, 'days')
  }
  if (volume < 20) {
    return moment().add(8, 'days')
  }
  if (volume < 40) {
    return moment().add(4, 'days')
  }
  if (volume < 80) {
    return moment().add(2, 'days')
  }

  return moment().add(1, 'day')
}

export const nextCardStatsCalculationTimeCalculator = {
  calculate,
  calculateV2,
  calculateV3,
}