import {EbayBuyingOption, EbayCurrencyAmount} from "./EbayApiClientTypes";
import {CurrencyAmountLike} from "../../money/CurrencyAmount";
import {InvalidArgumentError} from "../../../error/InvalidArgumentError";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {ListingType} from "../open-listing/EbayOpenListingEntity";
import {UnexpectedError} from "../../../error/UnexpectedError";


const parseCurrencyAmount = (amount:EbayCurrencyAmount):CurrencyAmountLike => {
  const numericValue = Number.parseFloat(amount.value)
  if (numericValue === Number.NaN) {
    throw new InvalidArgumentError(`Failed to parse Ebay Currency Amount: ${JSON.stringify(amount)}`)
  }

  return {
    currencyCode: <CurrencyCode>amount.currency,
    amountInMinorUnits: numericValue * 100,
  }
}

const parseListingTypes = (option:EbayBuyingOption):ListingType => {
  switch (option) {
    case EbayBuyingOption.AUCTION:
      return ListingType.BID;
    case EbayBuyingOption.BEST_OFFER:
      return ListingType.BEST_OFFER;
    case EbayBuyingOption.FIXED_PRICE:
      return ListingType.BUY_IT_NOW
    default:
      throw new UnexpectedError(`Unrecognised Ebay Buying Option: ${option}`)
  }
}


export const ebayApiClientTypeConverter = {
  parseCurrencyAmount,
  parseListingTypes,
}