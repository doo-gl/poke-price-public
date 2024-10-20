import {Entity} from "../../../database/Entity";
import {Timestamp} from "../../../external-lib/Firebase";


export interface ProductEntity extends Entity {
  stripeProductId:string,
  mostRecentEventTimestamp:Timestamp,
  active:boolean,
  name:string,
  description:string|null,
  role:string|null,
  imageUrls:Array<string>,
  metadata:{[name:string]:string}
  rawEvent:any,
}

