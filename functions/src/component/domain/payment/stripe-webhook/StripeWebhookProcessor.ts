import {logger} from "firebase-functions";
import {Stripe} from "stripe";
import {webhookProductUpserter} from "./WebhookProductUpserter";
import {webhookPriceUpserter} from "./WebhookPriceUpserter";
import {webhookProductDeleter} from "./WebhookProductDeleter";
import {webhookPriceDeleter} from "./WebhookPriceDeleter";
import {getStripe} from "../../../external-lib/Stripe";
import {webhookTaxRateUpserter} from "./WebhookTaxRateUpserter";
import {webhookPaymentIntentUpserter} from "./WebhookPaymentIntentUpserter";
import {extractId} from "../StripeIdExtractor";
import {webhookCheckoutSessionUpserter} from "./WebhookCheckoutSessionUpserter";
import {webhookInvoiceUpserter} from "./WebhookInvoiceUpserter";
import {webhookSubscriptionUpserter} from "./WebhookSubscriptionUpserter";
import {UnexpectedError} from "../../../error/UnexpectedError";
import {baseWebhookEventCreator, WebhookEventEntity} from "../event/WebhookEventEntity";
import {Create} from "../../../database/Entity";
import {TimestampStatic} from "../../../external-lib/Firebase";


/*
 * very much based on https://github.com/stripe/stripe-firebase-extensions/blob/114d09c6f4d3310acd3cc67702991ad02808047d/firestore-stripe-subscriptions/functions/src/index.ts#L512
 * Didn't like the way the extension handled customers integrating with firebase users.
 * Also wanted to simplify the logic a little so that the webhook is more about just capturing and recording the information
 */

const processEvent = async (event:Stripe.Event):Promise<void> => {
  // figure out what kind of webhook event this is then hand off to a component that deals with that type of event

  const eventType = event.type;
  switch (eventType) {
    case 'product.created':
    case 'product.updated':
      await webhookProductUpserter.upsert(event, event.data.object as Stripe.Product)
      break;
    case 'price.created':
    case 'price.updated':
      await webhookPriceUpserter.upsert(event, event.data.object as Stripe.Price)
      break;
    case 'product.deleted':
      await webhookProductDeleter.deleteProduct(event.data.object as Stripe.Product)
      break;
    case 'price.deleted':
      await webhookPriceDeleter.deletePrice(event.data.object as Stripe.Price)
      break;
    case 'tax_rate.created':
    case 'tax_rate.updated':
      await webhookTaxRateUpserter.upsert(event, event.data.object as Stripe.TaxRate);
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await webhookSubscriptionUpserter.upsert(event, event.data.object as Stripe.Subscription);
      break;
    case 'checkout.session.completed':
      const checkoutSession = event.data.object as Stripe.Checkout.Session;
      await webhookCheckoutSessionUpserter.upsert(event, checkoutSession);
      if (checkoutSession.mode === 'subscription') {
        const subscriptionId = extractId(checkoutSession.subscription);
        if (!subscriptionId) {
          break;
        }
        const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
        await webhookSubscriptionUpserter.upsert(event, subscription);
      } else {
        const paymentIntentId = extractId(checkoutSession.payment_intent);
        if (!paymentIntentId) {
          break;
        }
        const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);
        await webhookPaymentIntentUpserter.upsert(event, paymentIntent);
      }
      break;
    case 'invoice.paid':
    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed':
    case 'invoice.upcoming':
    case 'invoice.marked_uncollectible':
    case 'invoice.payment_action_required':
      await webhookInvoiceUpserter.upsert(event, event.data.object as Stripe.Invoice);
      break;
    case 'payment_intent.created':
    case 'payment_intent.processing':
    case 'payment_intent.succeeded':
    case 'payment_intent.canceled':
    case 'payment_intent.requires_action':
    case 'payment_intent.payment_failed':
      await webhookPaymentIntentUpserter.upsert(event, event.data.object as Stripe.PaymentIntent);
      break;
    default:
      const message = `Unexpected stripe event type: ${eventType}`;
      logger.error(message)
      throw new UnexpectedError(message)
  }
}

const saveEvent = async (event:Stripe.Event):Promise<void> => {

  const create:Create<WebhookEventEntity> = {
    eventId: event.id,
    type: event.type,
    // @ts-ignore
    eventObjectId: event.data?.object?.id ?? null,
    timestamp: TimestampStatic.fromMillis(event.created * 1000),
    event,
  }

   await baseWebhookEventCreator.create(create);
}

const processWebhook = async (event:Stripe.Event):Promise<void> => {

  await Promise.all([
    saveEvent(event),
    processEvent(event),
  ])
}

export const stripeWebhookProcessor = {
  processWebhook,
}