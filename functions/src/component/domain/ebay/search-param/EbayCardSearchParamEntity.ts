import {Entity} from "../../../database/Entity";
import {Timestamp} from "../../../external-lib/Firebase";

export interface SearchParams {
  includeKeywords:Array<string>,
  excludeKeywords:Array<string>,
}

export interface EbayCardSearchParamEntity extends Entity, SearchParams {
  cardId:string,
  itemId?:string,
  active:boolean,
  searchUrl:string,
  mostRecentSearchTime:Timestamp|null,
  lastReconciled:Timestamp,
  backfillTime?:Timestamp|null,
}