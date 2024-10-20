import {Entity} from "../../../database/Entity";
import {Timestamp} from "../../../external-lib/Firebase";


export interface TaxRateEntity extends Entity {
  stripeTaxRateId:string,
  mostRecentEventTimestamp:Timestamp,
  active:boolean,
  country:string|null,
  created:Timestamp,
  description:string|null,
  displayName:string,
  inclusive:boolean,
  jurisdiction:string|null,
  percentage:number,
  state:string|null,
  taxType:'gst'|'hst'|'pst'|'qst'|'sales_tax'|'vat'|'jct'|string|null,
  metadata:{[name:string]:string}|null
  rawEvent:object,
}