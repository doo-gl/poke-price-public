import {CurrencyAmount, CurrencyAmountLike, fromCurrencyAmountLike, Max, Zero} from "../../money/CurrencyAmount";
import {Stats} from "./CardStatsEntityV2";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {comparatorBuilder} from "../../../infrastructure/ComparatorBuilder";

const BY_AMOUNT_ASC = comparatorBuilder.objectAttributeASC<CurrencyAmountLike, number>(value => value.amountInMinorUnits);

interface MovingAverages {
  movingAverageFive:CurrencyAmountLike,
  movingAverageTen:CurrencyAmountLike,
  movingAverageTwenty:CurrencyAmountLike,
}

const defaultStats = (currencyCode:CurrencyCode):Stats => {
  const zero = Zero(currencyCode).toCurrencyAmountLike();
  return {
    count: 0,
    min: zero,
    firstQuartile: zero,
    median: zero,
    mean: zero,
    thirdQuartile: zero,
    max: zero,
    standardDeviation: zero,
    movingAverageFive: zero,
    movingAverageTen: zero,
    movingAverageTwenty: zero,
  }
}

const calculateStandardDeviation = (mean:CurrencyAmount, prices:Array<CurrencyAmountLike>):CurrencyAmount => {
  let totalSquaredDifference = Zero(mean.currencyCode);
  prices.forEach(price => {
    const differenceFromMean = fromCurrencyAmountLike(price).subtract(mean);
    const squaredDifferenceFromMean = differenceFromMean.square();
    totalSquaredDifference = totalSquaredDifference.add(squaredDifferenceFromMean);
  });
  const variance = totalSquaredDifference.divide(prices.length);
  const standardDeviation = variance.squareRoot();
  return standardDeviation;
}

const calculateMovingAverages = (currencyCode:CurrencyCode, prices:Array<CurrencyAmountLike>):MovingAverages => {
  let movingAverageFive = Zero(currencyCode);
  let movingAverageTen = Zero(currencyCode);
  let movingAverageTwenty = Zero(currencyCode);
  let count = 0;
  let runningTotal = Zero(currencyCode);
  for (let priceIndex = prices.length - 1; priceIndex >= 0; priceIndex--) {
    const price = prices[priceIndex];
    count++;
    runningTotal = runningTotal.add(fromCurrencyAmountLike(price));
    if (count <= 5) {
      movingAverageFive = runningTotal.divide(count);
    }
    if (count <= 10) {
      movingAverageTen = runningTotal.divide(count);
    }
    if (count <= 20) {
      movingAverageTwenty = runningTotal.divide(count);
    }
    if (count > 20) {
      break
    }
  }
  return {
    movingAverageFive: movingAverageFive.toCurrencyAmountLike(),
    movingAverageTen: movingAverageTen.toCurrencyAmountLike(),
    movingAverageTwenty: movingAverageTwenty.toCurrencyAmountLike(),
  }
}

const calculate = (currencyCode:CurrencyCode, prices:Array<CurrencyAmountLike>):Stats => {
  if (prices.length === 0) {
    return defaultStats(currencyCode);
  }
  const sortedPrices = prices.slice().sort(BY_AMOUNT_ASC);
  let totalAmount:CurrencyAmount = Zero(currencyCode);
  let min:CurrencyAmount = Max(currencyCode);
  let max:CurrencyAmount = Zero(currencyCode);
  let median:CurrencyAmount = Zero(currencyCode);
  let firstQuartile = Zero(currencyCode);
  let thirdQuartile = Zero(currencyCode);
  for (let priceIndex = 0; priceIndex < sortedPrices.length; priceIndex++) {
    const price = sortedPrices[priceIndex];
    const currencyAmount = fromCurrencyAmountLike(price);
    totalAmount = totalAmount.add(currencyAmount);

    if (currencyAmount.lessThan(min)) {
      min = currencyAmount;
    }
    if (currencyAmount.greaterThan(max)) {
      max = currencyAmount;
    }

    const isOddNumberOfElements = sortedPrices.length % 2 === 1;
    const isHalfwayThroughPrices = priceIndex === Math.floor(sortedPrices.length / 2);
    if (isOddNumberOfElements && isHalfwayThroughPrices) {
      median = currencyAmount;
    }
    if (!isOddNumberOfElements && isHalfwayThroughPrices) {
      const previousPrice = sortedPrices[priceIndex - 1];
      const previousCurrencyAmount = fromCurrencyAmountLike(previousPrice);
      median = (currencyAmount.add(previousCurrencyAmount)).divide(2);
    }

    const isQuarterwayThroughPrices = priceIndex === Math.floor(sortedPrices.length / 4)
    if (isOddNumberOfElements && isQuarterwayThroughPrices) {
      firstQuartile = currencyAmount
    }
    if (!isOddNumberOfElements && isQuarterwayThroughPrices) {
      if (priceIndex - 1 < 0) {
        firstQuartile = currencyAmount
      } else {
        const previousPrice = sortedPrices[priceIndex - 1];
        const previousCurrencyAmount = fromCurrencyAmountLike(previousPrice);
        firstQuartile = (currencyAmount.add(previousCurrencyAmount)).divide(2);
      }
    }

    const isThreeQuarterwayThroughPrices = priceIndex === Math.floor(3 * sortedPrices.length / 4)
    if (isOddNumberOfElements && isThreeQuarterwayThroughPrices) {
      thirdQuartile = currencyAmount
    }
    if (!isOddNumberOfElements && isThreeQuarterwayThroughPrices) {
      if (priceIndex - 1 < 0) { // shouldn't be needed but just in case
        thirdQuartile = currencyAmount
      } else {
        const previousPrice = sortedPrices[priceIndex - 1];
        const previousCurrencyAmount = fromCurrencyAmountLike(previousPrice);
        thirdQuartile = (currencyAmount.add(previousCurrencyAmount)).divide(2);
      }
    }

  }
  const count = sortedPrices.length;
  const mean = totalAmount.divide(count);
  const standardDeviation = calculateStandardDeviation(mean, sortedPrices);
  const movingAverages = calculateMovingAverages(currencyCode, prices);
  return {
    count,
    min: min.toCurrencyAmountLike(),
    firstQuartile: firstQuartile.toCurrencyAmountLike(),
    mean: mean.toCurrencyAmountLike(),
    median: median.toCurrencyAmountLike(),
    thirdQuartile: thirdQuartile.toCurrencyAmountLike(),
    max: max.toCurrencyAmountLike(),
    standardDeviation: standardDeviation.toCurrencyAmountLike(),
    movingAverageFive: movingAverages.movingAverageFive,
    movingAverageTen: movingAverages.movingAverageTen,
    movingAverageTwenty: movingAverages.movingAverageTwenty,
  }

}

export const statsCalculator = {
  defaultStats,
  calculate,
}