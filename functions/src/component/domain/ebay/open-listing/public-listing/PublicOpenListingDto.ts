import {CurrencyAmountLike} from "../../../money/CurrencyAmount";
import {CardCondition} from "../../../historical-card-price/CardCondition";
import {ListingType as EbayListingType} from '../EbayOpenListingEntity'

export enum ListingType {
  EBAY = 'EBAY'
}

export interface ListingDto {
  listingId:string,
  priority:number,
  itemId:string,

  itemPrice:CurrencyAmountLike|null,
  listingPrice:CurrencyAmountLike,
  localeListingPrice:CurrencyAmountLike,
  lastListingUpdate:string,
  listingUrl:string,
  listingType:ListingType,
  listingDetails:any,
}

export interface EbayListingDetails {
  bidCount:number|null,
  ebayListingTypes:Array<EbayListingType>,
  listingEndTime:string|null,
  condition:CardCondition|null,
}