import {momentToTimestamp} from "../../../tools/TimeConverter";
import moment, {Moment} from "moment-timezone";
import {BuyingOpportunity} from "./EbayOpenListingEntity";
import {Timestamp} from "../../../external-lib/Firebase";

export interface CheckCalculationDetails {
  listingDateCreated:Moment
  listingEndTime:Moment|null,
  listingBuyingOpportunity:BuyingOpportunity|null,
}

const calculate = (listingEndTime:Moment|null, listingDateCreated:Moment):Timestamp => {

  // if an end time is given, check a short time after that end time
  const now = moment();
  if (listingEndTime && listingEndTime.isAfter(now)) {
    return momentToTimestamp(moment(listingEndTime).add(10, 'minutes'));
  }

  const hoursListingHasBeenActive = Math.floor(moment().diff(listingDateCreated, "hours"));

  if (hoursListingHasBeenActive < 1) {
    return momentToTimestamp(now.add(3, 'hours'));
  }
  if (hoursListingHasBeenActive < 3) {
    return momentToTimestamp(now.add(6, 'hours'));
  }
  if (hoursListingHasBeenActive < 6) {
    return momentToTimestamp(now.add(12, 'hours'));
  }
  if (hoursListingHasBeenActive < 12) {
    return momentToTimestamp(now.add(1, 'days'));
  }
  return momentToTimestamp(now.add(2, 'days'));
}

const isGoodOpportunity = (buyingOpportunity:BuyingOpportunity|null):boolean => {
  if (!buyingOpportunity) {
    return false
  }
  return buyingOpportunity.score > 0;
}

const calculateWithEndTime = (buyingOpportunity:BuyingOpportunity|null, endTime:Moment):Timestamp => {
  const isGood = isGoodOpportunity(buyingOpportunity)
  const hoursToEndTime = Math.floor(endTime.diff(moment(), 'hours'))

  // listings that are not good opportunities are checked less frequently
  if (!isGood) {
    return momentToTimestamp(moment(endTime).add(10, 'minutes'));
  }

  // listings that are good opportunities get checked more frequently
  // if (hoursToEndTime >= 24) {
  //   return momentToTimestamp(moment().add(24, 'hours'));
  // }
  // if (hoursToEndTime >= 12) {
  //   return momentToTimestamp(moment().add(6, 'hours'));
  // }
  // if (hoursToEndTime >= 6) {
  //   return momentToTimestamp(moment().add(3, 'hours'));
  // }
  // if (hoursToEndTime >= 3) {
  //   return momentToTimestamp(moment().add(60, 'minutes'));
  // }
  // if (hoursToEndTime >= 1) {
  //   return momentToTimestamp(moment().add(20, 'minutes'));
  // }
  // return momentToTimestamp(moment(endTime).add(10, 'minutes'));

  if (hoursToEndTime >= 24) {
    return momentToTimestamp(moment().add(24, 'hours'));
  }
  if (hoursToEndTime >= 12) {
    return momentToTimestamp(moment().add(6, 'hours'));
  }
  if (hoursToEndTime >= 1) {
    return momentToTimestamp(moment().add(3, 'hours'));
  }
  // if (hoursToEndTime >= 3) {
  //   return momentToTimestamp(moment().add(60, 'minutes'));
  // }
  // if (hoursToEndTime >= 1) {
  //   return momentToTimestamp(moment().add(20, 'minutes'));
  // }
  return momentToTimestamp(moment(endTime).add(10, 'minutes'));
}

const calculateWithoutEndTime = (buyingOpportunity:BuyingOpportunity|null, listingCreated:Moment):Timestamp => {
  const isGood = isGoodOpportunity(buyingOpportunity)
  const hoursListingHasBeenActive = Math.floor(moment().diff(listingCreated, "hours"));

  if (!isGood) {
    if (hoursListingHasBeenActive <= 64) {
      return momentToTimestamp(moment().add(64, 'hours'));
    }
    return momentToTimestamp(moment().add(128, 'hours'));
  }


  // if (hoursListingHasBeenActive <= 2) {
  //   return momentToTimestamp(moment().add(2, 'hours'));
  // }
  // if (hoursListingHasBeenActive <= 4) {
  //   return momentToTimestamp(moment().add(4, 'hours'));
  // }
  // if (hoursListingHasBeenActive <= 8) {
  //   return momentToTimestamp(moment().add(8, 'hours'));
  // }
  if (hoursListingHasBeenActive <= 16) {
    return momentToTimestamp(moment().add(16, 'hours'));
  }
  if (hoursListingHasBeenActive <= 32) {
    return momentToTimestamp(moment().add(32, 'hours'));
  }
  return momentToTimestamp(moment().add(64, 'hours'));
}

const calculateV2 = (details:CheckCalculationDetails):Timestamp => {
  if (details.listingEndTime) {
    return calculateWithEndTime(details.listingBuyingOpportunity, details.listingEndTime)
  }
  return calculateWithoutEndTime(details.listingBuyingOpportunity, details.listingDateCreated)
}

export const nextCheckTimestampCalculator = {
  calculate,
  calculateV2,
}