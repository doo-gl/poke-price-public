import {SetId, UniqueSet} from "./UniqueSet";
import {CurrencyAmountLike} from "../money/CurrencyAmount";


export interface PublicSetDto extends UniqueSet, SetId {
  countInSet:number,
  displaySetNumber:string,
  pokePrice:CurrencyAmountLike,
  imageUrl:string,
  backgroundImageUrl:string|null,
  symbolImageUrl:string|null,
}

export interface PublicSetListDto {
  results:Array<PublicSetDto>,
}