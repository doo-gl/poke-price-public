import {ItemEntity} from "../item/ItemEntity";

export interface ItemModificationIdentificationRequest {
  item:ItemEntity,
  listing:{
    listingName:string,
    listingSpecifics:{[key:string]:string},
    listingUrl:string,
  }
}