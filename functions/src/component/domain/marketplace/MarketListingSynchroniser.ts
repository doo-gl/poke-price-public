import {MarketplaceListingEntity} from "./MarketplaceListingEntity";
import {ebayOpenListingRetriever} from "../ebay/open-listing/EbayOpenListingRetriever";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {ebayToMarketplaceListingConverter} from "./EbayToMarketplaceListingConverter";
import {marketplaceListingUpserter} from "./MarketplaceListingUpserter";
import {ListingState} from "../ebay/open-listing/EbayOpenListingEntity";
import {marketplaceListingDeleter} from "./MarketplaceListingDeleter";
import moment from "moment";
import {timestampToMoment} from "../../tools/TimeConverter";
import {ebayOpenListingChecker} from "../ebay/open-listing/EbayOpenListingChecker";
import {currencyExchanger} from "../money/CurrencyExchanger";

const synchronise = async (marketListing:MarketplaceListingEntity):Promise<void> => {
  const ebayListing = await ebayOpenListingRetriever.retrieveOptional(marketListing.listingId);
  if (!ebayListing) {
    await marketplaceListingDeleter.deleteListings([marketListing])
    return;
  }

  if (ebayListing.state !== ListingState.OPEN) {
    await marketplaceListingDeleter.deleteListings([marketListing])
    return;
  }

  const cutOff = moment().subtract(3, "days")
  const mostRecentUpdate = timestampToMoment(ebayListing.mostRecentUpdate)
  // if the ebay listing itself hasn't been updated recently, then perform a check on it
  if (mostRecentUpdate.isBefore(cutOff)) {
    // no need to synchronise manually after checking has run as this includes updating the market listing
    await ebayOpenListingChecker.checkFromListing(ebayListing)
    return;
  }

  const item = await cardItemRetriever.retrieve(marketListing.itemId)
  const exchanger = await currencyExchanger.buildExchanger(ebayListing.mostRecentPrice.currencyCode)
  const conversion = await ebayToMarketplaceListingConverter.convert(item, ebayListing, marketListing, exchanger)
  await marketplaceListingUpserter.upsertForConversions([conversion])
}

export const marketListingSynchroniser = {
  synchronise,
}