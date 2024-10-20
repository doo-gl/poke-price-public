import {EbayOpenListingEntity, ListingType} from "../ebay/open-listing/EbayOpenListingEntity";
import {ItemEntity} from "../item/ItemEntity";
import {SearchTag, toTag} from "../search-tag/SearchTagEntity";
import {convertEnumToKey} from "../../tools/KeyConverter";
import {cardConditionLabel} from "../historical-card-price/CardCondition";
import {ebayListingPriceExtractor} from "./EbayListingPriceExtractor";
import {bucketedCurrencyTagGenerator} from "./BucketedCurrencyTagGenerator";
import {timestampToMoment} from "../../tools/TimeConverter";
import moment from "moment";
import {CurrencyAmount} from "../money/CurrencyAmount";
import {itemTagExtractor} from "../item/tag/ItemTagExtractor";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {itemModificationTagGenerator} from "./ItemModificationTagGenerator";
import {CurrencyExchanger} from "../money/CurrencyExchanger";

export const LISTING_TYPE_SEARCH_TAG_KEY = 'listing-type'
export const CONDITION_SEARCH_TAG_KEY = 'condition'
export const CURRENCY_CODE_SEARCH_TAG_KEY = 'currency-code'
export const BIDS_SEARCH_TAG_KEY = 'bids'
export const PROFITABILITY_SEARCH_TAG_KEY = 'profitability'
export const PROFIT_AMOUNT_SEARCH_TAG_KEY = 'profit-amount'
export const PRICE_AMOUNT_SEARCH_TAG_KEY = 'price-amount'
export const END_TIME_SEARCH_TAG_KEY = 'end-time'
export const SUBSCRIPTION_TYPE_SEARCH_TAG_KEY = 'subscription-type'
export const GRADER_SEARCH_TAG_KEY = 'grading-company'
export const GRADE_SEARCH_TAG_KEY = 'grade'
export const GRADED_SEARCH_TAG_KEY = 'graded'

export enum END_TIME_TAG_VALUE {
  LESS_THAN_24_HOURS = 'less-than-24-hours',
  LESS_THAN_12_HOURS = 'less-than-12-hours',
  LESS_THAN_8_HOURS = 'less-than-8-hours',
  LESS_THAN_4_HOURS = 'less-than-4-hours',
  LESS_THAN_1_HOUR = 'less-than-1-hour',
}

export enum BidTag {
  NO_BIDS = 'NO_BID',
  LOW_BIDS = 'LOW_BID',
  MEDIUM_BIDS = 'MEDIUM_BID',
  HIGH_BIDS = 'HIGH_BID',
}

const mapBids = (bidCount:number):{tag:BidTag, label:string} => {
  if (bidCount > 15) {
    return {tag:BidTag.HIGH_BIDS, label: 'High bids'}
  }
  if (bidCount > 5) {
    return {tag:BidTag.MEDIUM_BIDS, label: 'Medium bids'}
  }
  if (bidCount > 0) {
    return {tag:BidTag.LOW_BIDS, label: 'Low bids'}
  }
  return {tag:BidTag.NO_BIDS, label: 'No bids'}
}

const extractTags = (listing:EbayOpenListingEntity, item:ItemEntity, exchanger:CurrencyExchanger):Array<SearchTag> => {
  const searchTags:Array<SearchTag> = [];

  if (listing.listingTypes.find(listingType => listingType === ListingType.BEST_OFFER)) {
    searchTags.push({key: LISTING_TYPE_SEARCH_TAG_KEY, value: convertEnumToKey(ListingType.BEST_OFFER), keyLabel: 'Listing Type', valueLabel: 'Best offer', public: true})
  }
  if (listing.listingTypes.find(listingType => listingType === ListingType.BID)) {
    searchTags.push({key: LISTING_TYPE_SEARCH_TAG_KEY, value: convertEnumToKey(ListingType.BID), keyLabel: 'Listing Type', valueLabel: 'Bid', public: true})
  }
  if (listing.listingTypes.find(listingType => listingType === ListingType.BUY_IT_NOW)) {
    searchTags.push({key: LISTING_TYPE_SEARCH_TAG_KEY, value: convertEnumToKey(ListingType.BUY_IT_NOW), keyLabel: 'Listing Type', valueLabel: 'Buy it now', public: true})
  }
  searchTags.push({key: CONDITION_SEARCH_TAG_KEY, value: convertEnumToKey(listing.condition), keyLabel: 'Condition', valueLabel: cardConditionLabel(listing.condition), public: true});
  searchTags.push({key: CURRENCY_CODE_SEARCH_TAG_KEY, value: convertEnumToKey(listing.mostRecentPrice.currencyCode), keyLabel: 'Currency', valueLabel: listing.mostRecentPrice.currencyCode, public: true})
  if (listing.mostRecentBidCount !== null) {
    const bidTag = mapBids(listing.mostRecentBidCount)
    searchTags.push({key: BIDS_SEARCH_TAG_KEY, value: convertEnumToKey(bidTag.tag), keyLabel: 'Bids', valueLabel: bidTag.label, public: true})
  }

  const currentProfit = ebayListingPriceExtractor.calculateCurrentProfit(listing, item, exchanger)
  if (currentProfit) {
    if (currentProfit.isZeroOrPositive()) {
      searchTags.push({ key: PROFITABILITY_SEARCH_TAG_KEY, value: 'profitable', keyLabel: 'Profitability', valueLabel: 'Profitable', public: true})
    } else {
      searchTags.push({ key: PROFITABILITY_SEARCH_TAG_KEY, value: 'not-profitable', keyLabel: 'Profitability', valueLabel: 'Not Profitable', public: true})
    }
  }
  const profitTagValues = bucketedCurrencyTagGenerator.generate(currentProfit);
  if (profitTagValues && profitTagValues.length > 0) {
    profitTagValues.forEach(val => {
      searchTags.push({ ...val, key: PROFIT_AMOUNT_SEARCH_TAG_KEY, keyLabel: 'Profit', public: true})
    })
  }

  const currentPrice = ebayListingPriceExtractor.calculateCurrentPrice(listing, item)
  const priceTagValues = bucketedCurrencyTagGenerator.generate(currentPrice);
  if (priceTagValues && priceTagValues.length > 0) {
    priceTagValues.forEach(val => {
      searchTags.push({ ...val, key: PRICE_AMOUNT_SEARCH_TAG_KEY, keyLabel: 'Price', public: true})
    })
  }

  const endTime = listing.listingEndTime ? timestampToMoment(listing.listingEndTime) : null;
  if (endTime) {
    if (endTime.isSameOrBefore(moment().add(24, 'hours'))) {
      searchTags.push({ key: END_TIME_SEARCH_TAG_KEY, value: END_TIME_TAG_VALUE.LESS_THAN_24_HOURS, keyLabel: 'End Time', valueLabel: 'Less than a day', public: true })
    }
    if (endTime.isSameOrBefore(moment().add(12, 'hours'))) {
      searchTags.push({ key: END_TIME_SEARCH_TAG_KEY, value: END_TIME_TAG_VALUE.LESS_THAN_12_HOURS, keyLabel: 'End Time', valueLabel: 'Less than 12 hours', public: true })
    }
    if (endTime.isSameOrBefore(moment().add(8, 'hours'))) {
      searchTags.push({ key: END_TIME_SEARCH_TAG_KEY, value: END_TIME_TAG_VALUE.LESS_THAN_8_HOURS, keyLabel: 'End Time', valueLabel: 'Less than 8 hours', public: true })
    }
    if (endTime.isSameOrBefore(moment().add(4, 'hours'))) {
      searchTags.push({ key: END_TIME_SEARCH_TAG_KEY, value: END_TIME_TAG_VALUE.LESS_THAN_4_HOURS, keyLabel: 'End Time', valueLabel: 'Less than 4 hours', public: true })
    }
    if (endTime.isSameOrBefore(moment().add(1, 'hours'))) {
      searchTags.push({ key: END_TIME_SEARCH_TAG_KEY, value: END_TIME_TAG_VALUE.LESS_THAN_1_HOUR, keyLabel: 'End Time', valueLabel: 'Less than 1 hour', public: true })
    }
  }

  const isFreeInfoListing = currentProfit && currentProfit.lessThanOrEqual(new CurrencyAmount(250, currentProfit.currencyCode))
  if (isFreeInfoListing) {
    searchTags.push({ key: SUBSCRIPTION_TYPE_SEARCH_TAG_KEY, value: 'free', keyLabel: 'Subscription type', valueLabel: 'Free', public: true })
  } else {
    searchTags.push({ key: SUBSCRIPTION_TYPE_SEARCH_TAG_KEY, value: 'pro', keyLabel: 'Subscription type', valueLabel: 'Pro', public: true })
  }

  const itemModification = listing.itemModification
  if (itemModification) {
    const gradingTags = itemModificationTagGenerator.generate(itemModification)
    gradingTags.forEach(gradingTag => searchTags.push(gradingTag))
  }

  const itemSearchTags = itemTagExtractor.extract(item)
  itemSearchTags.forEach(tag => searchTags.push(tag))

  searchTags.sort(comparatorBuilder.objectAttributeASC(tag => toTag(tag)))

  return searchTags;
}

export const ebayListingTagExtractor = {
  extractTags,
}