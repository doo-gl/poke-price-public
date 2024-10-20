import {Image, ItemType, ItemTypeV2} from "./ItemEntity";
import {CurrencyAmountLike} from "../money/CurrencyAmount";


export interface ItemDto {
  itemId:string,
  legacyItemId?:string
  name:string,
  image:Image,
  price:CurrencyAmountLike|null,
  itemType:ItemType,
  itemDetails:any,
}

export interface CardItemDetails {
  cardNumber:string,
  setNumber:string,
  logoUrl:string|null,
}