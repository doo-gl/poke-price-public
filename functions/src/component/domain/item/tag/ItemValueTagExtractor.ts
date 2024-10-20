import {ItemEntity, ItemPrices, PriceType} from "../ItemEntity";
import {SearchTag} from "../../search-tag/SearchTagEntity";
import {
  ListingPriceValueTag,
  ListingVolumeValueTag,
  SoldPriceValueTag,
  SoldVolumeValueTag,
  SupplyVsDemandValueTag,
  TotalCirculationValueTag,
  VolatilityValueTag,
} from "../../card/query/ValueTagExtractor";
import {itemPriceQuerier} from "../ItemPriceQuerier";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {capitalizeEnum, convertEnumToKey} from "../../../tools/KeyConverter";


export const LISTING_PRICE_SEARCH_TAG_KEY = 'listing-price';
export const LISTING_VOLUME_SEARCH_TAG_KEY = 'listing-volume';
export const SOLD_PRICE_SEARCH_TAG_KEY = 'sold-price';
export const SOLD_VOLUME_SEARCH_TAG_KEY = 'sold-volume';
export const SUPPLY_VS_DEMAND_SEARCH_TAG_KEY = 'supply-vs-demand';
export const TOTAL_CIRCULATION_SEARCH_TAG_KEY = 'total-circulation';
export const VOLATILITY_SEARCH_TAG_KEY = 'volatility';

const extractSoldPrice = (itemPrices:ItemPrices):SoldPriceValueTag|null => {
  const priceDetails = itemPriceQuerier.query(CurrencyCode.GBP, PriceType.SALE, itemPrices)
  const soldPrice = priceDetails?.price;
  if (!soldPrice) {
    return null;
  }
  if (soldPrice.amountInMinorUnits > 30000) {
    return SoldPriceValueTag.VERY_HIGH_VALUE
  }
  if (soldPrice.amountInMinorUnits > 10000) {
    return SoldPriceValueTag.HIGH_VALUE
  }
  if (soldPrice.amountInMinorUnits > 3000) {
    return SoldPriceValueTag.RELATIVELY_HIGH_VALUE
  }
  if (soldPrice.amountInMinorUnits > 1000) {
    return SoldPriceValueTag.MODERATE_VALUE
  }
  if (soldPrice.amountInMinorUnits > 300) {
    return SoldPriceValueTag.RELATIVELY_LOW_VALUE
  }
  if (soldPrice.amountInMinorUnits > 70) {
    return SoldPriceValueTag.LOW_VALUE
  }
  return SoldPriceValueTag.VERY_LOW_VALUE
}

const extractListingPrice = (itemPrices:ItemPrices):ListingPriceValueTag|null => {
  const priceDetails = itemPriceQuerier.query(CurrencyCode.GBP, PriceType.LISTING, itemPrices)
  const listingPrice = priceDetails?.price;
  if (!listingPrice) {
    return null;
  }
  if (listingPrice.amountInMinorUnits > 30000) {
    return ListingPriceValueTag.VERY_HIGH_PRICE
  }
  if (listingPrice.amountInMinorUnits > 10000) {
    return ListingPriceValueTag.HIGH_PRICE
  }
  if (listingPrice.amountInMinorUnits > 3000) {
    return ListingPriceValueTag.RELATIVELY_HIGH_PRICE
  }
  if (listingPrice.amountInMinorUnits > 1000) {
    return ListingPriceValueTag.MODERATE_PRICE
  }
  if (listingPrice.amountInMinorUnits > 300) {
    return ListingPriceValueTag.RELATIVELY_LOW_PRICE
  }
  if (listingPrice.amountInMinorUnits > 70) {
    return ListingPriceValueTag.LOW_PRICE
  }
  return ListingPriceValueTag.VERY_LOW_PRICE
}

const calculateSoldVolume = (itemPrices:ItemPrices, preferredCurrency?:CurrencyCode):number|null => {
  const priceDetails = itemPriceQuerier.query(preferredCurrency ?? CurrencyCode.GBP, PriceType.SALE, itemPrices)
  if (!priceDetails || priceDetails.volume === null || priceDetails.periodSizeDays === null) {
    return null
  }
  return (priceDetails.volume / priceDetails.periodSizeDays) * 14
}

const extractSoldVolume = (itemPrices:ItemPrices):SoldVolumeValueTag|null => {
  const priceDetails = itemPriceQuerier.query(CurrencyCode.GBP, PriceType.SALE, itemPrices)
  const soldVolume = priceDetails?.volume ?? null
  if (soldVolume === null) {
    return null;
  }
  if (soldVolume >= 30) {
    return SoldVolumeValueTag.VERY_FREQUENTLY_SOLD
  }
  if (soldVolume >= 20) {
    return SoldVolumeValueTag.FREQUENTLY_SOLD
  }
  if (soldVolume >= 10) {
    return SoldVolumeValueTag.OCCASIONALLY_SOLD
  }
  if (soldVolume >= 5) {
    return SoldVolumeValueTag.RARELY_SOLD
  }
  if (soldVolume >= 5) {
    return SoldVolumeValueTag.VERY_RARELY_SOLD
  }
  return SoldVolumeValueTag.NONE_RECENTLY_SOLD
}

const calculateListingVolume = (itemPrices:ItemPrices):number|null => {
  const priceDetails = itemPriceQuerier.query(CurrencyCode.GBP, PriceType.LISTING, itemPrices)
  if (!priceDetails || priceDetails.volume === null || priceDetails.periodSizeDays === null) {
    return null
  }
  if (priceDetails.periodSizeDays === 1) {
    return priceDetails.volume
  }
  return (priceDetails.volume / priceDetails.periodSizeDays) * 14
}

const extractListingVolume = (itemPrices:ItemPrices):ListingVolumeValueTag|null => {
  const priceDetails = itemPriceQuerier.query(CurrencyCode.GBP, PriceType.LISTING, itemPrices)
  const listingVolume = priceDetails?.volume ?? null;
  if (listingVolume === null) {
    return null;
  }
  if (listingVolume >= 30) {
    return ListingVolumeValueTag.VERY_FREQUENTLY_LISTED
  }
  if (listingVolume >= 20) {
    return ListingVolumeValueTag.FREQUENTLY_LISTED
  }
  if (listingVolume >= 10) {
    return ListingVolumeValueTag.OCCASIONALLY_LISTED
  }
  if (listingVolume >= 5) {
    return ListingVolumeValueTag.RARELY_LISTED
  }
  if (listingVolume >= 5) {
    return ListingVolumeValueTag.VERY_RARELY_LISTED
  }
  return ListingVolumeValueTag.NONE_RECENTLY_LISTED
}

const calculateTotalCirculation = (itemPrices:ItemPrices):number => {
  const soldVolume = calculateSoldVolume(itemPrices);
  const listingVolume = calculateListingVolume(itemPrices);
  return (soldVolume ?? 0) + (listingVolume ?? 0)
}

const extractTotalCirculation = (itemPrices:ItemPrices):TotalCirculationValueTag|null => {
  const totalCirculation = calculateTotalCirculation(itemPrices)
  if (totalCirculation >= 60) {
    return TotalCirculationValueTag.VERY_HIGH_CIRCULATION
  }
  if (totalCirculation >= 30) {
    return TotalCirculationValueTag.HIGH_CIRCULATION
  }
  if (totalCirculation >= 10) {
    return TotalCirculationValueTag.MODERATE_CIRCULATION
  }
  if (totalCirculation > 1) {
    return TotalCirculationValueTag.LOW_CIRCULATION
  }
  return TotalCirculationValueTag.VERY_LOW_CIRCULATION
}

const calculateSupplyVsDemand = (itemPrices:ItemPrices):number|null => {
  const listingVolume = calculateListingVolume(itemPrices) ?? 0
  const soldVolume = calculateSoldVolume(itemPrices) ?? 0
  const totalCirculation = listingVolume + soldVolume
  if (totalCirculation < 10) {
    return null
  }
  if (listingVolume === 0) {
    return 0
  }
  if (soldVolume === 0) {
    return 1000
  }
  const ratio = listingVolume / soldVolume;
  return ratio
}

const extractSupplyVsDemand = (itemPrices:ItemPrices):SupplyVsDemandValueTag|null => {
  const ratio = calculateSupplyVsDemand(itemPrices)
  if (ratio === null) {
    return null
  }
  if (ratio >= 3) {
    return SupplyVsDemandValueTag.VERY_HIGH_SUPPLY
  }
  if (ratio >= 1.2) {
    return SupplyVsDemandValueTag.HIGH_SUPPLY
  }
  if (ratio >= 0.8) {
    return SupplyVsDemandValueTag.AVERAGE_SUPPLY
  }
  if (ratio > 0.3) {
    return SupplyVsDemandValueTag.HIGH_DEMAND
  }
  return SupplyVsDemandValueTag.VERY_HIGH_DEMAND
}

const calculateVolatility = (itemPrices:ItemPrices):number|null => {
  const priceDetails = itemPriceQuerier.query(CurrencyCode.GBP, PriceType.SALE, itemPrices)
  const soldHigh = priceDetails?.highPrice ?? null;
  const soldLow = priceDetails?.lowPrice ?? null;
  const soldPrice = priceDetails?.price ?? null;
  if (soldHigh === null || soldLow === null || soldPrice === null || soldPrice.amountInMinorUnits <= 0) {
    return null;
  }
  const volatility = (soldHigh.amountInMinorUnits - soldLow.amountInMinorUnits) / soldPrice.amountInMinorUnits
  return volatility
}

const extractVolatility = (itemPrices:ItemPrices):VolatilityValueTag|null => {
  const volatility = calculateVolatility(itemPrices)
  if (volatility === null) {
    return null
  }
  if (volatility >= 1) {
    return VolatilityValueTag.VERY_VOLATILE
  }
  if (volatility >= 0.5) {
    return VolatilityValueTag.VOLATILE
  }
  if (volatility >= 0.2) {
    return VolatilityValueTag.MODERATELY_STABLE
  }
  if (volatility > 0.1) {
    return VolatilityValueTag.STABLE
  }
  return VolatilityValueTag.VERY_STABLE
}

const extract = (itemPrices:ItemPrices):Array<SearchTag> => {
  const searchTags:Array<SearchTag> = [];
  const add = (key:string, keyLabel:string, value:string) => {
    searchTags.push({ key, value: convertEnumToKey(value), keyLabel, valueLabel: capitalizeEnum(value), public: true })
  }

  const soldPriceTag = extractSoldPrice(itemPrices)
  if (soldPriceTag) {
    add(SOLD_PRICE_SEARCH_TAG_KEY, 'Sold price', soldPriceTag)
  }
  const listingPriceTag = extractListingPrice(itemPrices)
  if (listingPriceTag) {
    add(LISTING_PRICE_SEARCH_TAG_KEY, 'Listing price', listingPriceTag)
  }
  const soldVolumeTag = extractSoldVolume(itemPrices)
  if (soldVolumeTag) {
    add(SOLD_VOLUME_SEARCH_TAG_KEY, 'Sold volume', soldVolumeTag)
  }
  const listingVolumeTag = extractListingVolume(itemPrices)
  if (listingVolumeTag) {
    add(LISTING_VOLUME_SEARCH_TAG_KEY, 'Listing volume', listingVolumeTag)
  }
  const volatilityTag = extractVolatility(itemPrices)
  if (volatilityTag) {
    add(VOLATILITY_SEARCH_TAG_KEY, 'Volatility', volatilityTag)
  }
  const supplyVsDemandTag = extractSupplyVsDemand(itemPrices)
  if (supplyVsDemandTag) {
    add(SUPPLY_VS_DEMAND_SEARCH_TAG_KEY, 'Supply vs Demand', supplyVsDemandTag)
  }
  const totalCirculationTag = extractTotalCirculation(itemPrices)
  if (totalCirculationTag) {
    add(TOTAL_CIRCULATION_SEARCH_TAG_KEY, 'Total Circulation', totalCirculationTag)
  }

  return searchTags;
}

export const itemValueTagExtractor = {
  extract,
  calculateListingVolume,
  calculateSoldVolume,
  calculateTotalCirculation,
}