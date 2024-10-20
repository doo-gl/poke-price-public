import {fromCurrencyAmountLike} from "../domain/money/CurrencyAmount";
import {comparatorBuilder} from "../infrastructure/ComparatorBuilder";


export interface SuperSetSizeEstimation {
  lowerBoundSize:number
  size:number,
  upperBoundSize:number,
  firstQuartileDiff:number,
  medianDiff:number,
  thirdQuartileDiff:number,
  largestValue:number,
  numberOfUuidsUsed:number,
}

const toBase10 = (value:string, truncateLength:number):number => {
  return parseInt(
      value.replace(/-/gim, '').slice(0, truncateLength),
      16
    )
}

const estimate = (inputUuids:Array<string>, truncateLength = 8):SuperSetSizeEstimation => {
  const uuids = inputUuids.slice()
  const base10Values = uuids.map(uuid => toBase10(uuid, truncateLength))
  base10Values.sort(comparatorBuilder.objectAttributeASC(val => val))
  const differences = new Array<number>()
  for (let i = 1; i < base10Values.length; i++) {
    const previousValue = base10Values[i - 1]
    const currentValue = base10Values[i]
    differences.push(currentValue - previousValue)
  }

  differences.sort(comparatorBuilder.objectAttributeASC(val => val))

  let median = 0
  let firstQuartile = 0
  let thirdQuartile = 0

  for (let index = 0; index < differences.length; index++) {
    const diff = differences[index]

    const isOddNumberOfElements = differences.length % 2 === 1;
    const isHalfwayThrough = index === Math.floor(differences.length / 2);
    if (isOddNumberOfElements && isHalfwayThrough) {
      median = diff;
    }
    if (!isOddNumberOfElements && isHalfwayThrough) {
      const previous = differences[index - 1];
      median = (diff + previous) / 2
    }

    const isQuarterwayThrough = index === Math.floor(differences.length / 4)
    if (isOddNumberOfElements && isQuarterwayThrough) {
      firstQuartile = diff
    }
    if (!isOddNumberOfElements && isQuarterwayThrough) {
      if (index - 1 < 0) {
        firstQuartile = diff
      } else {
        const previous = differences[index - 1];
        firstQuartile = (diff + previous) / 2;
      }
    }

    const isThreeQuarterwayThrough = index === Math.floor(3 * differences.length / 4)
    if (isOddNumberOfElements && isThreeQuarterwayThrough) {
      thirdQuartile = diff
    }
    if (!isOddNumberOfElements && isThreeQuarterwayThrough) {
      if (index - 1 < 0) { // shouldn't be needed but just in case
        thirdQuartile = diff
      } else {
        const previous = differences[index - 1];
        thirdQuartile = (diff + previous) / 2;
      }
    }
  }

  // given the last uuid "ffffffff-ffff-...."
  // find how many median diffs needs to get from the first uuid to the final uuid
  // - this is the size estimate
  // - do the same for 1st / 3rd quartile for range estimates

  const largestValue = toBase10("ffffffff-ffff-ffff-ffff-ffffffffffff", truncateLength)

  const lowerBound = Math.floor(largestValue / thirdQuartile)
  const size = Math.floor(largestValue / median)
  const upperBound = Math.floor(largestValue / firstQuartile)

  return {
    lowerBoundSize: lowerBound,
    size,
    upperBoundSize: upperBound,
    firstQuartileDiff: firstQuartile,
    medianDiff: median,
    thirdQuartileDiff: thirdQuartile,
    largestValue,
    numberOfUuidsUsed: uuids.length,
  }
}

export const uuidSuperSetSizeEstimator = {
  estimate,
}