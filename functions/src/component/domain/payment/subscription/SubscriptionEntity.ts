import {Entity} from "../../../database/Entity";
import {Stripe} from "stripe";
import {Timestamp} from "../../../external-lib/Firebase";


export interface SubscriptionEntity extends Entity {
  stripeSubscriptionId:string,
  mostRecentEventTimestamp:Timestamp,
  applicationFeePercent:number|null,
  automaticTax:Stripe.Subscription.AutomaticTax,
  billingCycleAnchor:number,
  billingThresholds:Stripe.Subscription.BillingThresholds|null,
  cancelAt:Timestamp|null,
  cancelAtPeriodEnd:boolean,
  cancelledAt:Timestamp|null,
  collectionMethod:Stripe.Subscription.CollectionMethod|null,
  created:Timestamp,
  currentPeriodEnd:Timestamp,
  currentPeriodStart:Timestamp,
  customerId:string,
  daysUntilDue:number|null,
  defaultPaymentMethodId:string|null,
  defaultSourceId:string|null,
  defaultTaxRates:Array<Stripe.TaxRate>|null,
  discount:Stripe.Discount|null,
  endedAt:Timestamp|null,
  items:Array<Stripe.SubscriptionItem>,
  latestInvoiceId:string|null,
  nextPendingInvoiceItemInvoice:Timestamp|null,
  pauseCollection:Stripe.Subscription.PauseCollection|null,
  pendingInvoiceItemInterval:Stripe.Subscription.PendingInvoiceItemInterval|null,
  pendingSetupIntentId:string|null,
  pendingUpdate:Stripe.Subscription.PendingUpdate|null,
  scheduleId:string|null,
  startDate:Timestamp,
  status:Stripe.Subscription.Status,
  transferData:Stripe.Subscription.TransferData|null,
  trialEnd:Timestamp|null,
  trialStart:Timestamp|null,

  metadata:{[name:string]:string}
  rawEvent:object
}