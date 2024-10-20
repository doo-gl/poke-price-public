import {Entity} from "../../../database/Entity";
import {Stripe} from "stripe";
import {Timestamp} from "../../../external-lib/Firebase";


export interface PriceEntity extends Entity {
  stripePriceId:string,
  mostRecentEventTimestamp:Timestamp,
  active:boolean,
  billingScheme:'per_unit'|'tiered',
  tiersMode:'graduated'|'volume'|null,
  tiers:Array<Stripe.Price.Tier>|null
  description:string|null,
  type:'one_time'|'recurring',
  unitAmount:number|null,
  currency:string
  productId:string,
  recurring:Stripe.Price.Recurring|null,
  interval:'day'|'month'|'week'|'year'|null,
  intervalCount:number|null,
  trialPeriodDays:number|null,
  transformQuantity:Stripe.Price.TransformQuantity|null,
  metadata:{[name: string]: string},
  rawEvent:object,
}