import {CardEntity} from "./CardEntity";

const MAX_PRIORITY = 1000;
const ROUGH_MAX_PRICE_MINOR_UNITS = 50000; // £500
const PRICE_WEIGHTING = 6
const ROUGH_MAX_SALE_VOLUME = 35;
const SALE_WEIGHTING = 2;
const ROUGH_MAX_LISTING_VOLUME = 100;
const LISTING_WEIGHTING = 1;
const TOTAL_WEIGHTING = PRICE_WEIGHTING + SALE_WEIGHTING + LISTING_WEIGHTING;


const calculate = (card:CardEntity) => {
  const priceInMinorUnits = card.pokePriceV2?.soldPrice?.amountInMinorUnits ?? 0
  const saleVolume = card.pokePriceV2?.soldVolume ?? 0;
  const listingVolume = card.pokePriceV2?.listingVolume ?? 0;

  // each score takes their intrinsic value and divides by the expect rough maximum for this value
  // if something is over this max, then we just cap it at the maximum by taking the min(val/max, 1)
  // so if val/max is greater than 1 because the val is greater than the expected max, it just becomes 1.
  // then multiply by weighting / total weighting so that when all the scores are added together, they make a min 0, max 1 value
  // the value will have been appropriately weighed by the different scores.
  const pricePriorityScore = Math.min(priceInMinorUnits / ROUGH_MAX_PRICE_MINOR_UNITS, 1) * (PRICE_WEIGHTING / TOTAL_WEIGHTING)
  const salesPriorityScore = Math.min(saleVolume / ROUGH_MAX_SALE_VOLUME, 1) * (SALE_WEIGHTING / TOTAL_WEIGHTING)
  const listingsPriorityScore = Math.min(listingVolume / ROUGH_MAX_LISTING_VOLUME, 1) * (LISTING_WEIGHTING / TOTAL_WEIGHTING)

  // each of the scores combined add up to max, 1, min, 0
  // then, multiplying by the max priority gives a value in the range 0 to MAX_PRIORITY
  const priority = (pricePriorityScore + salesPriorityScore + listingsPriorityScore) * MAX_PRIORITY;

  return priority
}

export const cardPriorityCalculator = {
  calculate,
}