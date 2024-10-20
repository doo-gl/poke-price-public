import {Entity} from "../../../database/Entity";
import {CurrencyAmountLike} from "../../money/CurrencyAmount";
import {comparatorBuilder} from "../../../infrastructure/ComparatorBuilder";
import {CardCondition} from "../../historical-card-price/CardCondition";
import {Timestamp} from "../../../external-lib/Firebase";
import {AnomalousSale} from "./AnomalousSaleDetector";
import {ItemModification} from "../../modification/ItemModification";

export const BY_TIMESTAMP_DESC = comparatorBuilder.objectAttributeDESC<OpenListingHistory, number>(value => value.timestamp.toMillis())
export interface OpenListingHistory {
  timestamp:Timestamp,
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
  currentBuyItNowPrice:CurrencyAmountLike|null,
  numberOfBids:number|null,
  canBuyNow:boolean,
  listingEnds:Timestamp|null,
  score:number,
}

export enum ListingType {
  BID = 'BID',
  BUY_IT_NOW = 'BUY_IT_NOW',
  BEST_OFFER = 'BEST_OFFER',
}

export enum ListingState {
  OPEN = 'OPEN',
  ENDED = 'ENDED',
  UNKNOWN = 'UNKNOWN',
}


export interface EbayOpenListingEntity extends Entity {
  cardId:string,
  historicalCardPriceId:string|null,
  searchIds:Array<string>,
  selectionIds:Array<string>

  mostRecentPrice:CurrencyAmountLike,
  mostRecentBidCount:number|null,
  mostRecentUpdate:Timestamp,
  history:Array<OpenListingHistory>,

  listingTypes:Array<ListingType>,
  listingName:string,
  listingEndTime:Timestamp|null,
  buyItNowPrice:CurrencyAmountLike|null,
  listingUrl:string,
  listingId:string,
  imageUrls:Array<string>|null,
  sellersNotes:string|null,
  listingSpecifics:{[key:string]:string},
  listingDescription:string|null,
  condition:CardCondition,

  buyingOpportunity:BuyingOpportunity|null,

  state:ListingState,
  unknownDetails:any,
  listingMessage:string|null,
  nextCheckTimestamp:Timestamp,
  isBestOffer?:boolean|null,
  anomalousSale?:AnomalousSale|null,

  extendedInfoCheckedAt?:Timestamp,
  itemModification?:ItemModification|null,
}