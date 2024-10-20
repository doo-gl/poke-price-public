import {Stripe} from "stripe";
import {Create} from "../../../database/Entity";
import {PaymentIntentEntity} from "../payment-intent/PaymentIntentEntity";
import {paymentIntentRetriever} from "../payment-intent/PaymentIntentRetriever";
import {basePaymentIntentCreator, basePaymentIntentUpdater} from "../payment-intent/PaymentIntentRepository";
import {extractId} from "../StripeIdExtractor";
import {timestampToMoment} from "../../../tools/TimeConverter";
import {logger} from "firebase-functions";
import {TimestampStatic} from "../../../external-lib/Firebase";


const upsert = async (event:Stripe.Event, paymentIntent:Stripe.PaymentIntent):Promise<void> => {

  const create:Create<PaymentIntentEntity> = {
    stripePaymentIntentId: paymentIntent.id,
    mostRecentEventTimestamp: TimestampStatic.fromMillis(event.created * 1000),
    amount: paymentIntent.amount,
    amountCapturable: paymentIntent.amount_capturable,
    amountReceived: paymentIntent.amount_received,
    applicationId: extractId(paymentIntent.application),
    applicationFeeAmount: paymentIntent.application_fee_amount,
    cancelledAt: paymentIntent.canceled_at ? TimestampStatic.fromMillis(paymentIntent.canceled_at * 1000) : null,
    cancellationReason: paymentIntent.cancellation_reason,
    captureMethod: paymentIntent.capture_method,
    charges: paymentIntent.charges.data,
    clientSecret: paymentIntent.client_secret,
    confirmationMethod: paymentIntent.confirmation_method,
    created: TimestampStatic.fromMillis(paymentIntent.created * 1000),
    currency: paymentIntent.currency,
    customerId: extractId(paymentIntent.customer),
    description: paymentIntent.description,
    invoiceId: extractId(paymentIntent.invoice),
    lastPaymentError: paymentIntent.last_payment_error,
    nextAction: paymentIntent.next_action,
    onBehalfOfAccountId: extractId(paymentIntent.on_behalf_of),
    paymentMethodId: extractId(paymentIntent.payment_method),
    paymentMethodOptions: paymentIntent.payment_method_options,
    paymentMethodTypes: paymentIntent.payment_method_types,
    receiptEmail: paymentIntent.receipt_email,
    reviewId: extractId(paymentIntent.review),
    setupFutureUsage: paymentIntent.setup_future_usage,
    shipping: paymentIntent.shipping,
    statementDescriptor: paymentIntent.statement_descriptor,
    statementDescriptorSuffix: paymentIntent.statement_descriptor_suffix,
    status: paymentIntent.status,
    transferData: paymentIntent.transfer_data,
    transferGroup: paymentIntent.transfer_group,
    metadata: paymentIntent.metadata,
    rawEvent: paymentIntent,
  }

  const preExistingEntity = await paymentIntentRetriever.retrieveOptionalByStripePaymentIntentId(paymentIntent.id);
  if (!preExistingEntity) {
    await basePaymentIntentCreator.create(create);
  } else {
    const lastUpdate = timestampToMoment(preExistingEntity.mostRecentEventTimestamp)
    const currentUpdate = timestampToMoment(create.mostRecentEventTimestamp)
    if (lastUpdate.isSameOrAfter(currentUpdate)) {
      logger.info(`Skipping payment intent update with id: ${preExistingEntity.id}, ${lastUpdate.toISOString()} >= ${currentUpdate.toISOString()}`)
      return;
    }
    await basePaymentIntentUpdater.merge(preExistingEntity.id, create)
  }
}

export const webhookPaymentIntentUpserter = {
  upsert,
}