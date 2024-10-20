import {
  CurrencyAmount,
  CurrencyAmountLike,
  fromCurrencyAmountLike,
  fromOptionalCurrencyAmountLike,
} from "../../money/CurrencyAmount";
import {
  BuyingOpportunity,
  BuyingOpportunityScorePart,
  EbayOpenListingEntity,
  ListingType,
} from "./EbayOpenListingEntity";
import {OpenListing} from "../card-price/open-listing-retrieval/EbayOpenListingParser";
import {EbayOpenListingCheckResult} from "../card-price/open-listing-retrieval/OpenListingPageChecker";
import {Moment} from "moment-timezone";
import {momentToTimestamp} from "../../../tools/TimeConverter";
import moment from "moment/moment";
import {CardEntity} from "../../card/CardEntity";
import {valueTagExtractor} from "../../card/query/ValueTagExtractor";
import {CardCondition} from "../../historical-card-price/CardCondition";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {conditionalPokePriceConverter} from "../../stats/card-v2/ConditionalPokePriceConverter";
import {ItemEntity, PriceType} from "../../item/ItemEntity";
import {itemPriceQuerier} from "../../item/ItemPriceQuerier";
import {itemValueTagExtractor} from "../../item/tag/ItemValueTagExtractor";

export interface ListingDetails {
  price:CurrencyAmountLike,
  buyItNowPrice:CurrencyAmountLike|null,
  numberOfBids:number|null,
  canBuyNow:boolean,
  listingEndTime:Moment|null,
}

export interface ItemDetails {
  soldMinPrice:CurrencyAmount|null,
  soldLowPrice:CurrencyAmount|null,
  soldPrice:CurrencyAmount,
  soldVolume:number,
}

const calculate = (listing:ListingDetails, item:ItemDetails):BuyingOpportunity|null => {

  const soldPrice = item.soldPrice;
  const soldVolume = item.soldVolume
  if (listing.price.currencyCode !== soldPrice.currencyCode) {
    return null;
  }

  const currentListingPrice = fromCurrencyAmountLike(listing.price)

  const scoreParts:Array<BuyingOpportunityScorePart> = [];
  if (currentListingPrice.lessThan(soldPrice)) {
    scoreParts.push({ reason: 'PRICE_BELOW_SOLD_PRICE', scoreChange: 10 })
  }
  if (item.soldMinPrice && currentListingPrice.lessThan(fromCurrencyAmountLike(item.soldMinPrice))) {
    scoreParts.push({ reason: 'PRICE_BELOW_MIN_SOLD_PRICE', scoreChange: 30 })
  }
  if (item.soldLowPrice && currentListingPrice.lessThan(fromCurrencyAmountLike(item.soldLowPrice))) {
    scoreParts.push({ reason: 'PRICE_BELOW_LOW_SOLD_PRICE', scoreChange: 15 })
  }
  if (listing.listingEndTime) {
    if (listing.listingEndTime.isSameOrBefore(moment().add(4, 'hour'))) {
      scoreParts.push({ reason: 'LISTING_ENDS_IN_FOUR_HOURS', scoreChange: 45 })
    } else if (listing.listingEndTime.isSameOrBefore(moment().add(8, 'hour'))) {
      scoreParts.push({ reason: 'LISTING_ENDS_IN_EIGHT_HOURS', scoreChange: 30 })
    } else if (listing.listingEndTime.isSameOrBefore(moment().add(16, 'hour'))) {
      scoreParts.push({ reason: 'LISTING_ENDS_IN_SIXTEEN_HOURS', scoreChange: 15 })
    }
  }
  const profitScore = Math.min(soldPrice.subtract(currentListingPrice).amountInMinorUnits / 10, 30)
  scoreParts.push({ reason: 'POTENTIAL_PROFIT', scoreChange: profitScore })
  const volumeScore = Math.min(soldVolume / 3, 30)
  scoreParts.push({ reason: 'SELLING_VOLUME', scoreChange: volumeScore })

  const score = scoreParts.map(part => part.scoreChange).reduce((l:number, r:number) => l + r)
  return {
    scoreParts,
    currentListingPrice: currentListingPrice.toCurrencyAmountLike(),
    currentBuyItNowPrice: null,
    soldPrice: soldPrice.toCurrencyAmountLike(),
    soldVolume,
    soldLowPrice: item.soldLowPrice?.toCurrencyAmountLike() ?? null,
    soldMinPrice: item.soldMinPrice?.toCurrencyAmountLike() ?? null,
    numberOfBids: null,
    canBuyNow: listing.canBuyNow,
    listingEnds: listing.listingEndTime ? momentToTimestamp(listing.listingEndTime) : null,
    score,
  }
}

const extractItemDetails = (item:ItemEntity, listingCurrencyCode:CurrencyCode, condition:CardCondition):ItemDetails|null => {
  const itemPriceDetails = itemPriceQuerier.query(listingCurrencyCode, PriceType.SALE, item.itemPrices);
  if (!itemPriceDetails || itemPriceDetails.currencyCode !== listingCurrencyCode) {
    return null
  }
  const soldVolume = itemValueTagExtractor.calculateSoldVolume(item.itemPrices)
  if (!soldVolume) {
    return null
  }
  const soldMinPrice = fromOptionalCurrencyAmountLike(itemPriceDetails.minPrice)
  const soldLowPrice = fromOptionalCurrencyAmountLike(itemPriceDetails.lowPrice)
  const soldPrice = fromOptionalCurrencyAmountLike(itemPriceDetails.price)
  if (!soldPrice) {
    return null;
  }

  const conditionalSoldMinPrice = soldMinPrice ? conditionalPokePriceConverter.convert(soldMinPrice, condition) : null;
  const conditionalSoldLowPrice = soldLowPrice ? conditionalPokePriceConverter.convert(soldLowPrice, condition) : null;
  const conditionalSoldPrice = conditionalPokePriceConverter.convert(soldPrice, condition)

  return {
    soldMinPrice: fromOptionalCurrencyAmountLike(conditionalSoldMinPrice),
    soldLowPrice: fromOptionalCurrencyAmountLike(conditionalSoldLowPrice),
    soldPrice: fromCurrencyAmountLike(conditionalSoldPrice),
    soldVolume,
  }
}

const calculateFromCheck = (openListing:EbayOpenListingEntity, openListingResult:EbayOpenListingCheckResult, item:ItemEntity):BuyingOpportunity|null => {
  const listingPrice = openListingResult.price ?? openListing.mostRecentPrice
  const itemDetails = extractItemDetails(item, listingPrice.currencyCode, openListing.condition)

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
  const itemDetails = extractItemDetails(item, listingPrice.currencyCode, condition)

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

export const buyingOpportunityCalculator = {
  calculate,
  calculateFromCheck,
  calculateFromSource,
  extractItemDetails,
}