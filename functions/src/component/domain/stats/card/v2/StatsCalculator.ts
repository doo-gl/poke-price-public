import {CurrencyAmount, CurrencyAmountLike, fromCurrencyAmountLike, Max, Zero} from "../../../money/CurrencyAmount";
import {CurrencyCode} from "../../../money/CurrencyCodes";
import {comparatorBuilder} from "../../../../infrastructure/ComparatorBuilder";

export interface PriceStats {
  count:number,
  mean:CurrencyAmountLike,
  min:CurrencyAmountLike,
  max:CurrencyAmountLike,
  median:CurrencyAmountLike,
  standardDeviation: CurrencyAmountLike,
}

const BY_CURRENCY_AMOUNT_ASC = comparatorBuilder.objectAttributeASC<CurrencyAmountLike, number>(value => value.amountInMinorUnits);

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

const calculate = (prices:Array<CurrencyAmountLike>):PriceStats|null => {
  if (prices.length === 0) {
    return null;
  }
  const sortedPrices = prices.slice().sort(BY_CURRENCY_AMOUNT_ASC);
  const currencyCode:CurrencyCode = prices[0].currencyCode;
  let totalAmount:CurrencyAmount = Zero(currencyCode);
  let min:CurrencyAmount = Max(currencyCode);
  let max:CurrencyAmount = Zero(currencyCode);
  let median:CurrencyAmount = Zero(currencyCode);
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
  }
  const count = sortedPrices.length;
  const mean = totalAmount.divide(count);
  const standardDeviation = calculateStandardDeviation(mean, sortedPrices);
  return {
    count,
    min: min.toCurrencyAmountLike(),
    mean: mean.toCurrencyAmountLike(),
    median: median.toCurrencyAmountLike(),
    max: max.toCurrencyAmountLike(),
    standardDeviation: standardDeviation.toCurrencyAmountLike(),
  }
}

export const statsCalculator = {
  calculate,
}