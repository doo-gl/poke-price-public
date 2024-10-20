import {Entity} from "../../../database/Entity";
import {DeactivationDetails, State} from "../../historical-card-price/HistoricalCardPriceEntity";
import {Timestamp} from "../../../external-lib/Firebase";
import {CurrencyAmountLike} from "../../money/CurrencyAmount";
import {CardCondition} from "../../historical-card-price/CardCondition";
import {Images} from "../ItemEntity";


export interface ItemSaleEntity extends Entity {
  itemId:string
  itemListingId:string,
  searchIds:Array<string>,
  selectionIds:Array<string>,
  state:State,
  deactivationDetails:DeactivationDetails|null,

  soldAt:Timestamp,
  salePrice:CurrencyAmountLike,

  images:Images

  sourceType:string,
  sourceId:string|null,
  sourceDetails:any,

  itemType:string,
  itemDetails:any,
}

export interface EbayItemSaleDetails {
  listingUrl:string,
  listingId:string,
  listingName:string,
}

export interface SingleCardItemSaleDetails {
  condition:CardCondition
  // things like grading would go in here
}