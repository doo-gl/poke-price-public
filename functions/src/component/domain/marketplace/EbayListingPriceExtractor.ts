import {EbayOpenListingEntity} from "../ebay/open-listing/EbayOpenListingEntity";
import {ItemEntity, PriceType} from "../item/ItemEntity";
import {
  CurrencyAmount,
  CurrencyAmountLike,
  fromCurrencyAmountLike,
  fromOptionalCurrencyAmountLike,
} from "../money/CurrencyAmount";
import {itemPriceQuerier} from "../item/ItemPriceQuerier";
import {CurrencyCode} from "../money/CurrencyCodes";
import {conditionalPokePriceConverter} from "../stats/card-v2/ConditionalPokePriceConverter";
import {ALLOWED_CURRENCY_CODES} from "../user/UserCurrencyUpdater";
import {CurrencyExchanger, ExchangeRate} from "../money/CurrencyExchanger";



const calculateBidPrice = (listing:EbayOpenListingEntity, item:ItemEntity):CurrencyAmount|null => {
  return listing.mostRecentBidCount !== null ? fromCurrencyAmountLike(listing.mostRecentPrice) : null;
}

const calculateBidProfit = (listing:EbayOpenListingEntity, item:ItemEntity, exchanger:CurrencyExchanger):CurrencyAmount|null => {
  const currentItemPrice = calculateCurrentItemPrice(listing, item, exchanger);
  return listing.mostRecentBidCount !== null && currentItemPrice && listing.mostRecentPrice.currencyCode === currentItemPrice.currencyCode
    ? fromCurrencyAmountLike(currentItemPrice).subtract(fromCurrencyAmountLike(listing.mostRecentPrice))
    : null;
}

const calculateBuyNowPrice = (listing:EbayOpenListingEntity, item:ItemEntity):CurrencyAmount|null => {
  return fromOptionalCurrencyAmountLike(listing.buyItNowPrice)
}

const calculateBuyNowProfit = (listing:EbayOpenListingEntity, item:ItemEntity, exchanger:CurrencyExchanger):CurrencyAmount|null => {
  const currentItemPrice = calculateCurrentItemPrice(listing, item, exchanger);
  return listing.buyItNowPrice && currentItemPrice && listing.buyItNowPrice.currencyCode === currentItemPrice.currencyCode
    ? fromCurrencyAmountLike(currentItemPrice).subtract(fromCurrencyAmountLike(listing.buyItNowPrice))
    : null;
}

const calculateCurrentProfit = (listing:EbayOpenListingEntity, item:ItemEntity, exchanger:CurrencyExchanger):CurrencyAmount|null => {
  const currentItemPrice = calculateCurrentItemPrice(listing, item, exchanger)
  const currentPrice = calculateCurrentPrice(listing, item);
  const currentProfit = currentItemPrice && currentPrice && currentItemPrice.currencyCode === currentPrice.currencyCode
    ? currentItemPrice.subtract(currentPrice)
    : null;
  return currentProfit
}

const calculateCurrentPrice = (listing:EbayOpenListingEntity, item:ItemEntity):CurrencyAmount|null => {
  const bidPrice = listing.mostRecentBidCount !== null && listing.mostRecentPrice
    ? fromCurrencyAmountLike(listing.mostRecentPrice)
    : null;
  const buyNowPrice = fromOptionalCurrencyAmountLike(listing.buyItNowPrice);
  if (!bidPrice && !buyNowPrice || bidPrice?.currencyCode !== buyNowPrice?.currencyCode) {
    return null;
  }
  if (!bidPrice) {
    return buyNowPrice;
  }
  if (!buyNowPrice) {
    return bidPrice;
  }
  return bidPrice.lessThanOrEqual(buyNowPrice)
    ? bidPrice
    : buyNowPrice;
}

const calculateCurrentItemPrice = (listing:EbayOpenListingEntity, item:ItemEntity, exchanger:CurrencyExchanger):CurrencyAmount|null => {
  const listingCurrency = listing.mostRecentPrice.currencyCode;
  if (!ALLOWED_CURRENCY_CODES.has(listingCurrency)) {
    return null;
  }
  const convertPrice = (price:CurrencyAmountLike|null):CurrencyAmount|null => {
    if (!price) {
      return null
    }
    if (price.currencyCode !== exchanger.toCurrencyCode()) {
      return fromOptionalCurrencyAmountLike(exchanger.exchange(price))
    }
    return fromCurrencyAmountLike(price)
  }

  const modificationKey = listing.itemModification?.key
  if (modificationKey) {
    const itemPriceForModification = itemPriceQuerier.modificationPrice(item, modificationKey)
    return convertPrice(itemPriceForModification)
  }
  const nearMintItemPrice = itemPriceQuerier.pokePrice(item, listingCurrency)?.price
  const condition = listing.condition
  if (!nearMintItemPrice) {
    return null;
  }
  const conditionalPrice = conditionalPokePriceConverter.convert(nearMintItemPrice, condition)
  return convertPrice(conditionalPrice)
}

export const ebayListingPriceExtractor = {
  calculateBidPrice,
  calculateBidProfit,
  calculateBuyNowPrice,
  calculateBuyNowProfit,
  calculateCurrentPrice,
  calculateCurrentProfit,
  calculateCurrentItemPrice,
}