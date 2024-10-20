import {CurrencyAmountLike} from "../../money/CurrencyAmount";
import {Images} from "../../item/ItemEntity";
import {listingDetailMapperFactory} from "./ListingDetailMapperFactory";
import {ListingDetailMapper, ListingDetails} from "../MarketplaceListingEntity";


export enum EbayListingBuyType {
  BID = 'BID',
  BUY_IT_NOW = 'BUY_IT_NOW',
  BEST_OFFER = 'BEST_OFFER',
}
type EbayListingType = "ebay-listing"
export const EBAY_LISTING_TYPE:EbayListingType = "ebay-listing";
export interface EbayListingDetails extends ListingDetails {
  mostRecentBidCount:number|null,
  buyItNowPrice:CurrencyAmountLike|null,
  bidPrice:CurrencyAmountLike|null,
  listingTypes:Array<EbayListingBuyType>,
  listingName:string,
  listingEndTime:Date|null,
  listingUrl:string,
  listingId:string,
  images:Images,
  sellersNotes:string|null,
  listingSpecifics:{[key:string]:string},
  listingDescription:string|null,
  listingMessage:string|null,
}
export type EbayListingDetailMapper = ListingDetailMapper<EbayListingType, EbayListingDetails>
export const ebayListingDetailMapper = listingDetailMapperFactory.build<EbayListingType, EbayListingDetails>(EBAY_LISTING_TYPE);