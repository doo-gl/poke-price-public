import {MarketplaceListingEntity} from "../MarketplaceListingEntity";
import {PublicListingDetails} from "../MarketplaceListingMapper";
import {publicEbayListingDetailMapper} from "./PublicEbayListingDetailMapper";
import {EBAY_LISTING_TYPE} from "./EbayListingDetails";

const mapPublicInfo = (listing:MarketplaceListingEntity):PublicListingDetails => {
  if (listing.listingType === EBAY_LISTING_TYPE) {
    return publicEbayListingDetailMapper.mapPublicInfo(listing)
  }
  return {}
}

const mapFullInfo = (listing:MarketplaceListingEntity):PublicListingDetails => {
  if (listing.listingType === EBAY_LISTING_TYPE) {
    return publicEbayListingDetailMapper.mapFullInfo(listing)
  }
  return {}
}

export const publicListingDetailMapper = {
  mapFullInfo,
  mapPublicInfo,
}