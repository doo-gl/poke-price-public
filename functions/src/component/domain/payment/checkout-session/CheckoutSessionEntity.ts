import {Entity} from "../../../database/Entity";
import {Stripe} from "stripe";
import {Timestamp} from "../../../external-lib/Firebase";


export interface CheckoutSessionEntity extends Entity {
  stripeCheckoutSessionId:string,
  mostRecentEventTimestamp:Timestamp,
  cancelUrl:string,
  successUrl:string,
  allowPromotionCodes:boolean|null,
  amountTotal:number|null,
  amountSubtotal:number|null,
  automaticTax:Stripe.Checkout.Session.AutomaticTax,
  billingAddressCollection:Stripe.Checkout.Session.BillingAddressCollection|null,
  clientReferenceId:string|null,
  currency:string|null,
  customerId:string|null,
  customerDetails:Stripe.Checkout.Session.CustomerDetails|null,
  customerEmail:string|null,
  lineItems:Array<Stripe.LineItem>|null,
  locale:Stripe.Checkout.Session.Locale|null,
  mode:Stripe.Checkout.Session.Mode,
  paymentIntentId:string|null,
  paymentMethodOptions:Stripe.Checkout.Session.PaymentMethodOptions|null,
  paymentMethodTypes:Array<string>,
  paymentStatus:Stripe.Checkout.Session.PaymentStatus,
  setupIntentId:string|null,
  shipping:Stripe.Checkout.Session.Shipping|null,
  shippingAddressCollection:Stripe.Checkout.Session.ShippingAddressCollection|null,
  submitType:Stripe.Checkout.Session.SubmitType|null,
  subscriptionId:string|null,
  taxIdCollection:Stripe.Checkout.Session.TaxIdCollection|null,
  totalDetails:Stripe.Checkout.Session.TotalDetails|null,
  url:string|null,
  metadata:{[name:string]:string}|null,
  rawEvent:object,
}