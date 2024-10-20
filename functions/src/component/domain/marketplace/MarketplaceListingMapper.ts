import {MarketplaceListingEntity} from "./MarketplaceListingEntity";
import {CurrencyAmountLike} from "../money/CurrencyAmount";
import {SearchTag} from "../search-tag/SearchTagEntity";
import {UserEntity} from "../user/UserEntity";
import {userMembershipQuerier} from "../membership/UserMembershipQuerier";
import {publicListingDetailMapper} from "./listing-details/PublicListingDetailsMapper";
import {publicItemDetailMapper} from "./item-details/PublicItemDetailsMapper";

export interface PublicItemDetails {}
export interface PublicListingDetails {}

export interface PublicMarketplaceListing {
  id:string,
  mostRecentUpdate:string,
  listingEndsAt:string|null,
  currentProfit:CurrencyAmountLike|null,
  currentPrice:CurrencyAmountLike|null,
  currentItemPrice:CurrencyAmountLike|null,
  currentBidPrice:CurrencyAmountLike|null,
  currentBidProfit:CurrencyAmountLike|null,
  currentBuyNowPrice:CurrencyAmountLike|null,
  currentBuyNowProfit:CurrencyAmountLike|null,

  itemId?:string,
  itemType:string,
  itemDetails:PublicItemDetails

  listingId?:string,
  listingType:string,
  listingDetails:PublicListingDetails,

  tags?:Array<string>,
  searchTags?:Array<SearchTag>
}

const mapFullInfoListing = (listing:MarketplaceListingEntity):PublicMarketplaceListing => {
  return {
    ...mapPublicInfoListing(listing),
    itemDetails: publicItemDetailMapper.mapFullInfo(listing),
    listingDetails: publicListingDetailMapper.mapFullInfo(listing),

  }
}

const mapPublicInfoListing = (listing:MarketplaceListingEntity):PublicMarketplaceListing => {

  return {
    id: listing._id.toString(),
    listingId: listing.listingId,
    listingType: listing.listingType,
    listingDetails: publicListingDetailMapper.mapPublicInfo(listing),
    listingEndsAt: listing.listingEndsAt?.toISOString() ?? null,
    mostRecentUpdate: listing.mostRecentUpdate.toISOString(),
    currentItemPrice: listing.currentItemPrice,
    currentPrice: listing.currentPrice,
    currentProfit: listing.currentProfit,
    currentBidPrice: listing.currentBidPrice,
    currentBidProfit: listing.currentBidProfit,
    currentBuyNowPrice: listing.currentBuyNowPrice,
    currentBuyNowProfit: listing.currentBuyNowProfit,
    itemType: listing.itemType,
    itemId: listing.itemId,
    itemDetails: publicItemDetailMapper.mapPublicInfo(listing),
    tags: listing.tags,
    searchTags: listing.searchTags,
  }
}

const isFreeInfoListing = (listing:MarketplaceListingEntity):boolean => {
  return !!listing.searchTags.find(tag => tag.key === 'subscription-type' && tag.value === 'free')
}

const mapListingsForUser = (listings:Array<MarketplaceListingEntity>, user:UserEntity|null):Array<PublicMarketplaceListing> => {

  return listings.map(mapFullInfoListing)

  // const isProUser = !!user && userMembershipQuerier.isPokePriceProUser(user);
  // if (isProUser) {
  //   return listings.map(mapFullInfoListing)
  // }
  // return listings.map(listing => {
  //   if (isFreeInfoListing(listing)) {
  //     return mapFullInfoListing(listing)
  //   } else {
  //     return mapPublicInfoListing(listing)
  //   }
  // })
}

export const marketplaceListingMapper = {
  mapListingsForUser,
}