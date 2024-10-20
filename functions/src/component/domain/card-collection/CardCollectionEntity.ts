import {CurrencyAmountLike} from "../money/CurrencyAmount";
import {Entity} from "../../database/Entity";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {Timestamp} from "../../external-lib/Firebase";
import {CurrencyCode} from "../money/CurrencyCodes";
import { SetRegion } from "../set/SetEntity";

export const BY_PRIORITY_DESC = comparatorBuilder.combineAll<CardCollectionEntity>(
  comparatorBuilder.objectAttributeDESC(value => value.priority),
  comparatorBuilder.objectAttributeASC(value => value.id),
)

export interface CardCollectionStats {
  totalPrice:CurrencyAmountLike,
  count:number,
  visibleCount:number,
  visibleTotalPrice:CurrencyAmountLike,
  lastUpdatedAt:Timestamp
}

export interface CardCollectionPriceStats {
  totalPrice:CurrencyAmountLike,
  visibleTotalPrice:CurrencyAmountLike,
  currencyCode:CurrencyCode,
}

export interface CardCollectionStatsV2 {
  prices:Array<CardCollectionPriceStats>
  count:number,
  visibleCount:number,
  lastUpdatedAt:Timestamp
}


export interface CardCollectionEntity extends Entity {
  name:string,
  displayName:string,
  backgroundImageUrl:string|null,
  imageUrl:string|null,
  logoUrl:string|null,
  parentCollectionId:string|null,
  cardIds:Array<string>,
  visibleCardIds:Array<string>,
  stats:CardCollectionStats,
  statsV2:CardCollectionStatsV2,
  priority:number,
  visible:boolean,
  idempotencyKey:string,
  region:SetRegion|null,
}