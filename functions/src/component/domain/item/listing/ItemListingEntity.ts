import {CurrencyAmountLike} from "../../money/CurrencyAmount";
import {BuyingOpportunity, ListingType} from "../../ebay/open-listing/EbayOpenListingEntity";
import {CardCondition} from "../../historical-card-price/CardCondition";
import {Images, SingleCardItemDetails} from "../ItemEntity";
import {MongoEntity} from "../../../database/mongo/MongoEntity";

export enum ItemListingState {
  OPEN = 'OPEN',
  FINISHED = 'FINISHED',
  UNKNOWN = 'UNKNOWN',
}

export interface ItemListingEntity extends MongoEntity {
  itemId:string
  itemSaleId:string|null,
  searchIds:Array<string>,
  selectionIds:Array<string>,

  mostRecentPrice:CurrencyAmountLike,
  mostRecentBidCount:number|null,
  mostRecentUpdate:Date,
  mostRecentItemListingHistoryId:string|null

  listingState:ItemListingState,
  listingType:string,
  listingDetails:any,
  listingId:string,

  itemType:string
  itemDetails:any

  buyingOpportunity:BuyingOpportunity|null,
  nextCheckTimestamp:Date|null,
}

export interface SingleCardItemListingDetails extends SingleCardItemDetails {
  condition:CardCondition
  // things like grading would go in here
}


export interface ItemListingHistoryEntity extends ItemListingEntity {
  itemListingId:string,
}