import {MarketplaceListingEntity, MarketplaceListingSort} from "./MarketplaceListingEntity";
import moment from "moment";
import {CurrencyAmountLike} from "../money/CurrencyAmount";

const LARGE_NUMBER = Number.MAX_SAFE_INTEGER;
const LARGE_DATE = moment('3000-01-01T00:00:00Z').toDate()

const extract = (listing:MarketplaceListingEntity):MarketplaceListingSort => {
  return extractFromDetails(listing.currentPrice, listing.currentProfit, listing.listingEndsAt)
}

const extractFromDetails = (currentPrice:CurrencyAmountLike|null, currentProfit:CurrencyAmountLike|null, listingEndsAt:Date|null):MarketplaceListingSort => {
  const price = currentPrice?.amountInMinorUnits ?? LARGE_NUMBER;
  const profit = currentProfit?.amountInMinorUnits ?? LARGE_NUMBER;
  const endTime = listingEndsAt ?? LARGE_DATE;
  return {price, profit, endTime}
}

export const marketplaceListingSortExtractor = {
  extract,
  extractFromDetails,
}