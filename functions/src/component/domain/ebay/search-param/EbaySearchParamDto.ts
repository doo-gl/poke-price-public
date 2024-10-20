import {SearchParams} from "./EbayCardSearchParamEntity";
import {EntityDto} from "../../EntityDto";


export interface EbayCardSearchParamDto extends EntityDto, SearchParams {
  cardId:string,
  active:boolean,
  searchUrl:string,
  lastReconciled:string,
}