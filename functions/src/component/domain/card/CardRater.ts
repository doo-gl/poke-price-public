import {CurrencyAmount, fromOptionalCurrencyAmountLike} from "../money/CurrencyAmount";
import {ItemEntity, PriceType} from "../item/ItemEntity";
import {itemPriceQuerier} from "../item/ItemPriceQuerier";
import {CurrencyCode} from "../money/CurrencyCodes";

const R_MAX = 100;
const SPLIT_FACTOR = 0.4;
const UNPROFITABLE_RMAX = SPLIT_FACTOR * R_MAX
const PROFITABLE_RMAX = (1 - SPLIT_FACTOR) * R_MAX
const SENSITIVITY_FACTOR = 3;


const diffToRating = (soldPrice:CurrencyAmount, listingPrice:CurrencyAmount, rMax:number):number => {
  // rating based in units of SoldPrice, S
  // diff = abs(sold - listing) = D
  // as the diff between Sold and Listing increases, the rating gets larger
  // want to have a rating that is sensitive within S/2 of S
  // define a sensitivity factor, K, increasing this increases how quickly Rating reacts to changes to Diff
  // as diff goes larger than S then we tend to Rmax
  // R = Rmax (1 - K ^ (-2*D/S))
  // D = 0, R = 0
  // D = S/2, R = Rmax
  // D = S, R = Rmax/K^2
  // If Rmax = 50, and K = 3
  // leads to diff 0 to S/2 mapping to Ratings 0 to 33.3
  // diff S/2 to S mapping to Ratings 33.3 to 44.4

  const diff = soldPrice.subtract(listingPrice).abs().amountInMinorUnits;
  const soldUnit = soldPrice.amountInMinorUnits;
  const rating = rMax * (1 - SENSITIVITY_FACTOR ** (-2 * (diff/soldUnit)));
  return rating;
}

const rate = (card:ItemEntity):number|null => {
  // rating 0 to 40 => unprofitable
  // rating 40 to 100 => profitable
  const soldDetails = itemPriceQuerier.query(CurrencyCode.GBP, PriceType.SALE, card.itemPrices);
  const listingDetails = itemPriceQuerier.query(CurrencyCode.GBP, PriceType.LISTING, card.itemPrices);
  const soldPrice = fromOptionalCurrencyAmountLike(soldDetails?.price ?? null)

  const minListingPrice = fromOptionalCurrencyAmountLike(listingDetails?.minPrice ?? null);
  const listingPrice = fromOptionalCurrencyAmountLike(listingDetails?.price ?? null);
  const listingVolume = listingDetails?.volume ?? null;

  if (!soldPrice || !listingPrice) {
    return null;
  }

  if (!minListingPrice || !listingVolume) {
    if (listingPrice.greaterThan(soldPrice)) {
      return UNPROFITABLE_RMAX - diffToRating(soldPrice, listingPrice, UNPROFITABLE_RMAX);
    } else {
      return UNPROFITABLE_RMAX + diffToRating(soldPrice, listingPrice, PROFITABLE_RMAX);
    }
  }

  if (minListingPrice.greaterThan(soldPrice)) {
    return UNPROFITABLE_RMAX - diffToRating(soldPrice, minListingPrice, UNPROFITABLE_RMAX);
  } else {
    return UNPROFITABLE_RMAX + diffToRating(soldPrice, minListingPrice, PROFITABLE_RMAX);
  }
}

export const cardRater = {
  rate,
}