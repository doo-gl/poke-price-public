import {CardEntity, PokePriceV2} from "../CardEntity";

export enum SoldPriceValueTag {
  VERY_HIGH_VALUE = 'VERY_HIGH_VALUE',
  HIGH_VALUE = 'HIGH_VALUE',
  RELATIVELY_HIGH_VALUE = 'RELATIVELY_HIGH_VALUE',
  MODERATE_VALUE = 'MODERATE_VALUE',
  RELATIVELY_LOW_VALUE = 'RELATIVELY_LOW_VALUE',
  LOW_VALUE = 'LOW_VALUE',
  VERY_LOW_VALUE = 'VERY_LOW_VALUE',
}

export enum ListingPriceValueTag {
  VERY_HIGH_PRICE = 'VERY_HIGH_PRICE',
  HIGH_PRICE = 'HIGH_PRICE',
  RELATIVELY_HIGH_PRICE = 'RELATIVELY_HIGH_PRICE',
  MODERATE_PRICE = 'MODERATE_PRICE',
  RELATIVELY_LOW_PRICE = 'RELATIVELY_LOW_PRICE',
  LOW_PRICE = 'LOW_PRICE',
  VERY_LOW_PRICE = 'VERY_LOW_PRICE',
}

export enum SoldVolumeValueTag {
  VERY_FREQUENTLY_SOLD = 'VERY_FREQUENTLY_SOLD',
  FREQUENTLY_SOLD = 'FREQUENTLY_SOLD',
  OCCASIONALLY_SOLD = 'OCCASIONALLY_SOLD',
  RARELY_SOLD = 'RARELY_SOLD',
  VERY_RARELY_SOLD = 'VERY_RARELY_SOLD',
  NONE_RECENTLY_SOLD = 'NONE_RECENTLY_SOLD',
}

export enum ListingVolumeValueTag {
  VERY_FREQUENTLY_LISTED = 'VERY_FREQUENTLY_LISTED',
  FREQUENTLY_LISTED = 'FREQUENTLY_LISTED',
  OCCASIONALLY_LISTED = 'OCCASIONALLY_LISTED',
  RARELY_LISTED = 'RARELY_LISTED',
  VERY_RARELY_LISTED = 'VERY_RARELY_LISTED',
  NONE_RECENTLY_LISTED = 'NONE_RECENTLY_LISTED',
}

export enum TotalCirculationValueTag {
  VERY_HIGH_CIRCULATION = 'VERY_HIGH_CIRCULATION',
  HIGH_CIRCULATION = 'HIGH_CIRCULATION',
  MODERATE_CIRCULATION = 'MODERATE_CIRCULATION',
  LOW_CIRCULATION = 'LOW_CIRCULATION',
  VERY_LOW_CIRCULATION = 'VERY_LOW_CIRCULATION',
}

export enum SupplyVsDemandValueTag {
  VERY_HIGH_SUPPLY = 'VERY_HIGH_SUPPLY',
  HIGH_SUPPLY = 'HIGH_SUPPLY',
  AVERAGE_SUPPLY = 'AVERAGE_SUPPLY',
  HIGH_DEMAND = 'HIGH_DEMAND',
  VERY_HIGH_DEMAND = 'VERY_HIGH_DEMAND',
}

export enum VolatilityValueTag {
  VERY_VOLATILE = 'VERY_VOLATILE',
  VOLATILE = 'VOLATILE',
  MODERATELY_STABLE = 'MODERATELY_STABLE',
  STABLE = 'STABLE',
  VERY_STABLE = 'VERY_STABLE',
}

interface ValueQueryDetails {
  soldPrice?:SoldPriceValueTag,
  listingPrice?:ListingPriceValueTag,
  soldVolume?:SoldVolumeValueTag,
  listingVolume?:ListingVolumeValueTag,
  totalCirculation?:TotalCirculationValueTag,
  supplyVsDemand?:SupplyVsDemandValueTag,
  volatility?:VolatilityValueTag,
}

const extractSoldPrice = (pokePrice:PokePriceV2):SoldPriceValueTag|null => {
  const soldPrice = pokePrice.soldPrice
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

const extractListingPrice = (pokePrice:PokePriceV2):ListingPriceValueTag|null => {
  const listingPrice = pokePrice.listingPrice
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

const calculateSoldVolume = (pokePrice:PokePriceV2):number|null => {
  if (pokePrice.soldVolume === null || pokePrice.soldPeriodSizeDays === null) {
    return null
  }
  return (pokePrice.soldVolume / pokePrice.soldPeriodSizeDays) * 14
}

const extractSoldVolume = (pokePrice:PokePriceV2):SoldVolumeValueTag|null => {
  const soldVolume = calculateSoldVolume(pokePrice)
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

const calculateListingVolume = (pokePrice:PokePriceV2):number|null => {
  if (pokePrice.listingVolume === null || pokePrice.listingPeriodSizeDays === null) {
    return null
  }
  if (pokePrice.listingPeriodSizeDays === 1) {
    return pokePrice.listingVolume
  }
  return (pokePrice.listingVolume / pokePrice.listingPeriodSizeDays) * 14
}

const extractListingVolume = (pokePrice:PokePriceV2):ListingVolumeValueTag|null => {
  const listingVolume = calculateListingVolume(pokePrice)
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

const calculateTotalCirculation = (pokePrice:PokePriceV2):number => {
  const soldVolume = calculateSoldVolume(pokePrice);
  const listingVolume = calculateListingVolume(pokePrice);
  return (soldVolume ?? 0) + (listingVolume ?? 0)
}

const extractTotalCirculation = (pokePrice:PokePriceV2):TotalCirculationValueTag|null => {
  const totalCirculation = calculateTotalCirculation(pokePrice)
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

const calculateSupplyVsDemand = (pokePrice:PokePriceV2):number|null => {
  const listingVolume = calculateListingVolume(pokePrice) ?? 0
  const soldVolume = calculateSoldVolume(pokePrice) ?? 0
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

const extractSupplyVsDemand = (pokePrice:PokePriceV2):SupplyVsDemandValueTag|null => {
  const ratio = calculateSupplyVsDemand(pokePrice)
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

const calculateVolatility = (pokePrice:PokePriceV2):number|null => {
  const soldHigh = pokePrice.soldHighPrice;
  const soldLow = pokePrice.soldLowPrice;
  const soldPrice = pokePrice.soldPrice;
  if (soldHigh === null || soldLow === null || soldPrice === null || soldPrice.amountInMinorUnits <= 0) {
    return null;
  }
  const volatility = (soldHigh.amountInMinorUnits - soldLow.amountInMinorUnits) / soldPrice.amountInMinorUnits
  return volatility
}

const extractVolatility = (pokePrice:PokePriceV2):VolatilityValueTag|null => {
  const volatility = calculateVolatility(pokePrice)
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

const extract = (card:CardEntity):ValueQueryDetails => {
  const details:ValueQueryDetails = {}
  if (!card.pokePriceV2) {
    return details
  }
  const pokePrice = card.pokePriceV2;

  const soldPrice = extractSoldPrice(pokePrice);
  if (soldPrice) {
    details.soldPrice = soldPrice
  }

  const listingPrice = extractListingPrice(pokePrice);
  if (listingPrice) {
    details.listingPrice = listingPrice
  }

  const soldVolume = extractSoldVolume(pokePrice);
  if (soldVolume) {
    details.soldVolume = soldVolume
  }

  const listingVolume = extractListingVolume(pokePrice);
  if (listingVolume) {
    details.listingVolume = listingVolume
  }

  const totalCirculation = extractTotalCirculation(pokePrice);
  if (totalCirculation) {
    details.totalCirculation = totalCirculation
  }

  const supplyVsDemand = extractSupplyVsDemand(pokePrice);
  if (supplyVsDemand) {
    details.supplyVsDemand = supplyVsDemand
  }

  const volatility = extractVolatility(pokePrice);
  if (volatility) {
    details.volatility = volatility
  }

  return details;
}

export const valueTagExtractor = {
  extract,
  calculateSoldVolume,
  calculateListingVolume,
  calculateTotalCirculation,
  calculateVolatility,
  calculateSupplyVsDemand,
}