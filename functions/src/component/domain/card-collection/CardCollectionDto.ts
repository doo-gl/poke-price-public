import {CurrencyAmountLike} from "../money/CurrencyAmount";
import {CurrencyCode} from "../money/CurrencyCodes";
import {SetRegion} from "../set/SetEntity";


export interface PublicCollectionStats {
  count:number,
  totalPrice:CurrencyAmountLike,
}

export interface PublicCollectionPriceStats {
  totalPrice:CurrencyAmountLike,
  currencyCode:CurrencyCode,
}

export interface PublicCollectionStatsV2 {
  prices:Array<PublicCollectionPriceStats>
  count:number,
}

export interface PublicCardCollectionDto {
  collectionId:string,
  displayName:string,
  name:string,
  backgroundImageUrl:string|null,
  imageUrl:string|null,
  logoUrl:string|null,
  parentCollectionId:string|null,
  cardIds:Array<string>,
  stats:PublicCollectionStats,
  statsV2:PublicCollectionStatsV2,
  ownership:CardCollectionOwnershipDto|null,
  isFavourite:boolean,
  region:SetRegion|null
}

export interface CardCollectionOwnershipDto {
  cardCollectionId:string,
  userId:string,
  ownedCardIds:Array<string>,

}

export interface PublicCardCollectionDtoList {
  results:Array<PublicCardCollectionDto>,
}