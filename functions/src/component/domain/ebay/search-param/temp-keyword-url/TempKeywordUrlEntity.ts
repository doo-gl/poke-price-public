import {SearchParams} from "../EbayCardSearchParamEntity";
import {Entity} from "../../../../database/Entity";


export interface TempKeywordUrlEntity extends Entity {
  cardId:string,
  searchParams:SearchParams,
  openListingUrl:string,
  isUrlReviewed:boolean,
}