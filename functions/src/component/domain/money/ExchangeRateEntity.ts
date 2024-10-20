import {Entity} from "../../database/Entity";
import {CurrencyCode} from "./CurrencyCodes";
import {Timestamp} from "../../external-lib/Firebase";


export interface ExchangeRateEntity extends Entity {
  from:CurrencyCode,
  to:CurrencyCode,
  date:Timestamp,
  key:string, // from|to|date
  rate:number,
}