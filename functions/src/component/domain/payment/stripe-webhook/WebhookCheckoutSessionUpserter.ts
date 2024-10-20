import {Stripe} from "stripe";
import {Create} from "../../../database/Entity";
import {checkoutSessionRetriever} from "../checkout-session/CheckoutSessionRetriever";
import {baseCheckoutSessionCreator, baseCheckoutSessionUpdater} from "../checkout-session/CheckoutSessionRepository";
import {CheckoutSessionEntity} from "../checkout-session/CheckoutSessionEntity";
import {extractId} from "../StripeIdExtractor";
import {timestampToMoment} from "../../../tools/TimeConverter";
import {logger} from "firebase-functions";
import {TimestampStatic} from "../../../external-lib/Firebase";


const upsert = async (event:Stripe.Event, checkoutSession:Stripe.Checkout.Session):Promise<void> => {

  const create:Create<CheckoutSessionEntity> = {
    stripeCheckoutSessionId: checkoutSession.id,
    mostRecentEventTimestamp: TimestampStatic.fromMillis(event.created * 1000),
    cancelUrl: checkoutSession.cancel_url,
    successUrl: checkoutSession.success_url,
    allowPromotionCodes: checkoutSession.allow_promotion_codes,
    amountTotal: checkoutSession.amount_total,
    amountSubtotal: checkoutSession.amount_subtotal,
    automaticTax: checkoutSession.automatic_tax,
    billingAddressCollection: checkoutSession.billing_address_collection,
    clientReferenceId: checkoutSession.client_reference_id,
    currency: checkoutSession.currency,
    customerId: extractId(checkoutSession.customer),
    customerDetails: checkoutSession.customer_details,
    customerEmail: checkoutSession.customer_email,
    lineItems: checkoutSession.line_items?.data ?? null,
    locale: checkoutSession.locale,
    mode: checkoutSession.mode,
    paymentIntentId: extractId(checkoutSession.payment_intent),
    paymentMethodOptions: checkoutSession.payment_method_options,
    paymentMethodTypes: checkoutSession.payment_method_types,
    paymentStatus: checkoutSession.payment_status,
    setupIntentId: extractId(checkoutSession.setup_intent),
    shipping: checkoutSession.shipping,
    shippingAddressCollection: checkoutSession.shipping_address_collection,
    submitType: checkoutSession.submit_type,
    subscriptionId: extractId(checkoutSession.subscription),
    taxIdCollection: checkoutSession.tax_id_collection ?? null,
    totalDetails: checkoutSession.total_details,
    url: checkoutSession.url,
    metadata: checkoutSession.metadata,
    rawEvent: checkoutSession,
  }

  const preExistingEntity = await checkoutSessionRetriever.retrieveOptionalByStripeCheckoutSessionId(checkoutSession.id);
  if (!preExistingEntity) {
    await baseCheckoutSessionCreator.create(create);
  } else {
    const lastUpdate = timestampToMoment(preExistingEntity.mostRecentEventTimestamp)
    const currentUpdate = timestampToMoment(create.mostRecentEventTimestamp)
    if (lastUpdate.isSameOrAfter(currentUpdate)) {
      logger.info(`Skipping checkout session update with id: ${preExistingEntity.id}, ${lastUpdate.toISOString()} >= ${currentUpdate.toISOString()}`)
      return;
    }
    await baseCheckoutSessionUpdater.merge(preExistingEntity.id, create)
  }
}

export const webhookCheckoutSessionUpserter = {
  upsert,
}