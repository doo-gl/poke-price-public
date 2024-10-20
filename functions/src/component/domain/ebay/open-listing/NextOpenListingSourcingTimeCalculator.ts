import moment, {Moment} from "moment/moment";
import {valueTagExtractor} from "../../card/query/ValueTagExtractor";
import {ItemEntity} from "../../item/ItemEntity";
import {itemValueTagExtractor} from "../../item/tag/ItemValueTagExtractor";

const calculateFutureHours = (item:ItemEntity):number => {
  if (item.itemPrices.prices.length === 0) {
    return 48
  }
  const volume = itemValueTagExtractor.calculateListingVolume(item.itemPrices) ?? 0

  // if (volume >= 96) {
  //   return 6
  // }
  // if (volume >= 48) {
  //   return 12
  // }
  // if (volume >= 24) {
  //   return 24
  // }
  // return 48

  if (volume >= 96) {
    return 12
  }
  if (volume >= 48) {
    return 24
  }
  if (volume >= 24) {
    return 48
  }
  return 96
}

const calculate = (item:ItemEntity, isItemBeingWatched:boolean):Moment => {
  const hoursTilNextSource = calculateFutureHours(item);
  return moment()
    .add(isItemBeingWatched ? hoursTilNextSource / 2 : hoursTilNextSource, 'hours')
}

export const nextOpenListingSourcingTimeCalculator = {
  calculate,
}