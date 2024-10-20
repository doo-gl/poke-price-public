import {
  BuyingOpportunity,
  BuyingOpportunityScorePart,
  EbayOpenListingEntity,
  ListingType,
} from "./EbayOpenListingEntity";
import {buyingOpportunityCalculator, ItemDetails, ListingDetails} from "./BuyingOpportunityCalculator";
import {CurrencyAmountLike, fromCurrencyAmountLike, fromOptionalCurrencyAmountLike} from "../../money/CurrencyAmount";
import moment from "moment/moment";
import {momentToTimestamp} from "../../../tools/TimeConverter";
import {EbayOpenListingCheckResult} from "../card-price/open-listing-retrieval/OpenListingPageChecker";
import {OpenListing} from "../card-price/open-listing-retrieval/EbayOpenListingParser";
import {CardCondition} from "../../historical-card-price/CardCondition";
import {ItemEntity} from "../../item/ItemEntity";

const calculatePriceScoreParts = (price:CurrencyAmountLike, item:ItemDetails):Array<BuyingOpportunityScorePart> => {
  const listingPrice = fromCurrencyAmountLike(price);
  const soldPrice = fromCurrencyAmountLike(item.soldPrice)
  const soldLowPrice = fromOptionalCurrencyAmountLike(item.soldLowPrice);
  const soldMinPrice = fromOptionalCurrencyAmountLike(item.soldMinPrice);

  const scoreParts:Array<BuyingOpportunityScorePart> = [];

  if (listingPrice.greaterThan(soldPrice)) {
    return [];
  } else {
    const priceDiff = soldPrice.subtract(listingPrice);
    const scaledPriceDiff = priceDiff.amountInMinorUnits * 0.01;
    const priceDiffScore = Math.min(scaledPriceDiff, 20) // designed so that a price diff of £10 or more is a score of 20
    scoreParts.push({ reason: 'PRICE_DIFF', scoreChange: priceDiffScore })
  }

  if (soldMinPrice && listingPrice.lessThanOrEqual(soldMinPrice)) {
    scoreParts.push({ reason: 'LESS_THAN_MIN_SOLD_PRICE', scoreChange: 40 })
  } else if (soldLowPrice && listingPrice.lessThanOrEqual(soldLowPrice)) {
    scoreParts.push({ reason: 'LESS_THAN_LOW_SOLD_PRICE', scoreChange: 20 })
  } else if (listingPrice.lessThanOrEqual(soldPrice)) {
    scoreParts.push({ reason: 'LESS_THAN_SOLD_PRICE', scoreChange: 10 })
  }
  return scoreParts
}

const calculateBidScoreParts = (listing:ListingDetails, item:ItemDetails):Array<BuyingOpportunityScorePart> => {

  if (listing.listingEndTime === null) {
    return []
  }
  const priceScoreParts = calculatePriceScoreParts(listing.price, item);
  if (priceScoreParts.length === 0) {
    return []
  }

  const scoreParts:Array<BuyingOpportunityScorePart> = priceScoreParts.map(part => ({
    reason: `PRICE_${part.reason}`, scoreChange: part.scoreChange,
  }));
  const listingEndTime = listing.listingEndTime;

  if (listingEndTime.isSameOrBefore(moment().add(4, 'hour'))) {
    scoreParts.push({ reason: 'ENDS_IN_LESS_THAN_4_HOURS', scoreChange: 40 })
  } else if (listingEndTime.isSameOrBefore(moment().add(8, 'hour'))) {
    scoreParts.push({ reason: 'ENDS_IN_LESS_THAN_8_HOURS', scoreChange: 30 })
  } else if (listingEndTime.isSameOrBefore(moment().add(16, 'hour'))) {
    scoreParts.push({ reason: 'ENDS_IN_LESS_THAN_16_HOURS', scoreChange: 20 })
  } else if (listingEndTime.isSameOrBefore(moment().add(32, 'hour'))) {
    scoreParts.push({ reason: 'ENDS_IN_LESS_THAN_32_HOURS', scoreChange: 10 })
  }

  if (listing.numberOfBids === null) {
    return scoreParts
  }
  const numberOfBids = listing.numberOfBids;
  if (numberOfBids === 0) {
    scoreParts.push({ reason: 'NO_BIDS', scoreChange: 10 })
  } else if (numberOfBids <= 5) {
    scoreParts.push({ reason: 'SOME_BIDS', scoreChange: -10 })
  } else if (numberOfBids > 5) {
    scoreParts.push({ reason: 'MANY_BIDS', scoreChange: -20 })
  }

  return scoreParts;
}

const calculateBuyNowScoreParts = (listing:ListingDetails, item:ItemDetails):Array<BuyingOpportunityScorePart> => {
  if (!listing.canBuyNow || !listing.buyItNowPrice || listing.buyItNowPrice.currencyCode !== item.soldPrice.currencyCode) {
    return []
  }

  const priceScoreParts = calculatePriceScoreParts(listing.buyItNowPrice, item);
  if (priceScoreParts.length === 0) {
    return []
  }

  const scoreParts:Array<BuyingOpportunityScorePart> = priceScoreParts.map(part => ({
    reason: `BUY_NOW_PRICE_${part.reason}`, scoreChange: part.scoreChange,
  }));

  scoreParts.push({ reason: 'CAN_BUY_NOW', scoreChange: 40 })
  return scoreParts
}

const calculate = (listing:ListingDetails, item:ItemDetails):BuyingOpportunity|null => {

  const soldPrice = item.soldPrice;
  if (listing.price.currencyCode !== soldPrice.currencyCode) {
    return null;
  }

  const scoreParts:Array<BuyingOpportunityScorePart> = calculateBidScoreParts(listing, item)
    .concat(calculateBuyNowScoreParts(listing, item));

  const score = scoreParts.map(part => part.scoreChange).reduce((l:number, r:number) => l + r, 0)
  return {
    scoreParts,
    currentListingPrice: listing.price,
    currentBuyItNowPrice: listing.buyItNowPrice,
    soldPrice: soldPrice.toCurrencyAmountLike(),
    soldVolume: item.soldVolume,
    soldLowPrice: item.soldLowPrice?.toCurrencyAmountLike() ?? null,
    soldMinPrice: item.soldMinPrice?.toCurrencyAmountLike() ?? null,
    numberOfBids: listing.numberOfBids,
    canBuyNow: listing.canBuyNow,
    listingEnds: listing.listingEndTime ? momentToTimestamp(listing.listingEndTime) : null,
    score: Math.max(0, score),
  }
}

const calculateFromCheck = (openListing:EbayOpenListingEntity, openListingResult:EbayOpenListingCheckResult, item:ItemEntity):BuyingOpportunity|null => {
  const listingPrice = openListingResult.price ?? openListing.mostRecentPrice
  const itemDetails = buyingOpportunityCalculator.extractItemDetails(item, listingPrice.currencyCode, openListing.condition)

  if (!itemDetails) {
    return null
  }

  return calculate(
    {
      price: listingPrice,
      buyItNowPrice: openListingResult.buyItNowPrice,
      numberOfBids: openListingResult.bidCount,
      canBuyNow: openListing.listingTypes.some(type => type === ListingType.BUY_IT_NOW),
      listingEndTime: openListingResult.endedTimestamp,
    },
    itemDetails,
  )
}

const calculateFromSource = (listing:OpenListing, condition:CardCondition, item:ItemEntity):BuyingOpportunity|null => {
  const listingPrice = listing.price
  const itemDetails = buyingOpportunityCalculator.extractItemDetails(item, listingPrice.currencyCode, condition)

  if (!itemDetails) {
    return null
  }

  return calculate(
    {
      price: listing.price,
      buyItNowPrice: listing.buyItNowPrice,
      numberOfBids: listing.bidCount,
      canBuyNow: listing.listingTypes.some(type => type === ListingType.BUY_IT_NOW),
      listingEndTime: listing.endTime,
    },
    itemDetails,
  )
}

export const buyingOpportunityCalculatorV2 = {
  calculate,
  calculateFromCheck,
  calculateFromSource,
}