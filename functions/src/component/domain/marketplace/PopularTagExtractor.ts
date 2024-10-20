import {PopularTags} from "./MarketplaceListingEntity";
import {toInputValueSet} from "../../tools/SetBuilder";
import {keyValueToTag} from "../search-tag/SearchTagEntity";
import {CURRENCY_CODE_SEARCH_TAG_KEY, PROFITABILITY_SEARCH_TAG_KEY} from "./EbayListingTagExtractor";
import {CurrencyCode} from "../money/CurrencyCodes";


const extract = (tags:Array<string>):PopularTags => {
  const tagSet = toInputValueSet(tags)

  const profitableAndGbp = tagSet.has(keyValueToTag(PROFITABILITY_SEARCH_TAG_KEY, "profitable"))
    && tagSet.has(keyValueToTag(CURRENCY_CODE_SEARCH_TAG_KEY, CurrencyCode.GBP.toLowerCase()))

  return {
    profitableAndGbp,
  }
}

export const popularTagExtractor = {
  extract,
}