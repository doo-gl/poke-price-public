import {CurrencyAmountLike} from "../../money/CurrencyAmount";
import {ListingState, ListingType} from "./EbayOpenListingEntity";
import {EntityDto} from "../../EntityDto";

export interface OpenListingHistory {
  timestamp:string,
  price:CurrencyAmountLike|null,
  bidCount:number|null,
  searchUrl:string|null,
  searchId:string|null,
}

export interface BuyingOpportunityScorePart {
  scoreChange:number,
  reason:string,
}

export interface BuyingOpportunity {
  scoreParts:Array<BuyingOpportunityScorePart>
  soldVolume:number,
  soldPrice:CurrencyAmountLike,
  soldMinPrice:CurrencyAmountLike|null,
  soldLowPrice:CurrencyAmountLike|null,
  currentListingPrice:CurrencyAmountLike,
  canBuyNow:boolean,
  listingEnds:string|null,
  score:number,
}

export interface EbayOpenListingDto extends EntityDto {
  cardId:string,
  historicalCardPriceId:string|null,
  searchIds:Array<string>,

  mostRecentPrice:CurrencyAmountLike,
  mostRecentBidCount:number|null,
  mostRecentUpdate:string,
  history:Array<OpenListingHistory>,

  listingTypes:Array<ListingType>,
  listingName:string,
  listingEndTime:string|null,
  listingUrl:string,
  listingId:string,
  imageUrls:Array<string>|null,

  buyingOpportunity:BuyingOpportunity|null,

  state:ListingState,
  unknownDetails:any,
  listingMessage:string|null,
  nextCheckTimestamp:string,
}