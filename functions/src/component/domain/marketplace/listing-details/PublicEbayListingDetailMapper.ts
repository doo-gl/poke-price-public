import {MarketplaceListingEntity} from "../MarketplaceListingEntity";
import {PublicListingDetails} from "../MarketplaceListingMapper";
import {EbayListingBuyType, ebayListingDetailMapper} from "./EbayListingDetails";
import {Images} from "../../item/ItemEntity";

export interface PublicEbayListingDetails {
  mostRecentBidCount:number|null,
  listingTypes:Array<EbayListingBuyType>,
  listingName:string,
  listingImages:Images,
}

export interface FullInfoEbayListingDetails extends PublicEbayListingDetails {
  listingUrl:string,
}

const mapPublicInfo = (listing:MarketplaceListingEntity):PublicListingDetails => {
  const listingDetails = ebayListingDetailMapper.optionalDetails(listing)
  if (!listingDetails) {
    return {}
  }
  const publicDetails:PublicEbayListingDetails = {
    listingName: listingDetails.listingName,
    listingTypes: listingDetails.listingTypes,
    mostRecentBidCount: listingDetails.mostRecentBidCount,
    listingImages: listingDetails.images,
  }
  return publicDetails;
}

const mapFullInfo = (listing:MarketplaceListingEntity):PublicListingDetails => {
  const listingDetails = ebayListingDetailMapper.optionalDetails(listing)
  if (!listingDetails) {
    return {}
  }
  const fullDetails:FullInfoEbayListingDetails = {
    listingName: listingDetails.listingName,
    listingTypes: listingDetails.listingTypes,
    mostRecentBidCount: listingDetails.mostRecentBidCount,
    listingUrl: listingDetails.listingUrl,
    listingImages: listingDetails.images,
  }
  return fullDetails;
}

export const publicEbayListingDetailMapper = {
  mapFullInfo,
  mapPublicInfo,
}