import {CurrencyAmountLike} from "../../money/CurrencyAmount";


export interface ProductDto {
  productId:string
  name:string,
  prices:Array<PriceDto>,
}

export interface PriceDto {
  priceId:string,
  amount:CurrencyAmountLike,
  interval:'day'|'month'|'week'|'year'|null
  intervalCount:number|null,
}