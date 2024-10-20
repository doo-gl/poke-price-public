import {Stripe} from "stripe";
import {Create} from "../../../database/Entity";
import {baseSubscriptionCreator, baseSubscriptionUpdater} from "../subscription/SubscriptionRepository";
import {subscriptionRetriever} from "../subscription/SubscriptionRetriever";
import {SubscriptionEntity} from "../subscription/SubscriptionEntity";
import {extractId} from "../StripeIdExtractor";
import {subscriptionUpdatedMembershipHandler} from "../../membership/SubscriptionUpdatedMembershipHandler";
import {timestampToMoment} from "../../../tools/TimeConverter";
import {logger} from "firebase-functions";
import {TimestampStatic} from "../../../external-lib/Firebase";


const upsert = async (event:Stripe.Event, subscription:Stripe.Subscription):Promise<void> => {

  const create:Create<SubscriptionEntity> = {
    stripeSubscriptionId: subscription.id,
    mostRecentEventTimestamp: TimestampStatic.fromMillis(event.created * 1000),
    applicationFeePercent: subscription.application_fee_percent,
    automaticTax: subscription.automatic_tax,
    billingCycleAnchor: subscription.billing_cycle_anchor,
    billingThresholds: subscription.billing_thresholds,
    cancelAt: subscription.cancel_at ? TimestampStatic.fromMillis(subscription.cancel_at * 1000) : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    cancelledAt: subscription.canceled_at ? TimestampStatic.fromMillis(subscription.canceled_at * 1000) : null,
    collectionMethod: subscription.collection_method,
    created: TimestampStatic.fromMillis(subscription.created * 1000),
    currentPeriodEnd: TimestampStatic.fromMillis(subscription.current_period_end * 1000),
    currentPeriodStart: TimestampStatic.fromMillis(subscription.current_period_start * 1000),
    customerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
    daysUntilDue: subscription.days_until_due,
    defaultPaymentMethodId: extractId(subscription.default_payment_method),
    defaultSourceId: extractId(subscription.default_source),
    defaultTaxRates: subscription.default_tax_rates ?? null,
    discount: subscription.discount,
    endedAt: subscription.ended_at ? TimestampStatic.fromMillis(subscription.ended_at * 1000) : null,
    items: subscription.items.data,
    latestInvoiceId: extractId(subscription.latest_invoice),
    nextPendingInvoiceItemInvoice: subscription.next_pending_invoice_item_invoice ? TimestampStatic.fromMillis(subscription.next_pending_invoice_item_invoice * 1000) : null,
    pauseCollection: subscription.pause_collection,
    pendingInvoiceItemInterval: subscription.pending_invoice_item_interval,
    pendingSetupIntentId: extractId(subscription.pending_setup_intent),
    pendingUpdate: subscription.pending_update,
    scheduleId: extractId(subscription.schedule),
    startDate: TimestampStatic.fromMillis(subscription.start_date * 1000),
    status: subscription.status,
    transferData: subscription.transfer_data,
    trialEnd: subscription.trial_end ? TimestampStatic.fromMillis(subscription.trial_end * 1000) : null,
    trialStart: subscription.trial_start ? TimestampStatic.fromMillis(subscription.trial_start * 1000) : null,
    metadata: subscription.metadata,
    rawEvent: subscription,
  }

  const preExistingEntity = await subscriptionRetriever.retrieveOptionalByStripeSubscriptionId(subscription.id);
  let updatedSubscription;
  if (!preExistingEntity) {
    updatedSubscription = await baseSubscriptionCreator.create(create);
  } else {
    const lastUpdate = timestampToMoment(preExistingEntity.mostRecentEventTimestamp)
    const currentUpdate = timestampToMoment(create.mostRecentEventTimestamp)
    if (lastUpdate.isSameOrAfter(currentUpdate)) {
      logger.info(`Skipping subscription update with id: ${preExistingEntity.id}, ${lastUpdate.toISOString()} >= ${currentUpdate.toISOString()}`)
      return;
    }
    updatedSubscription = await baseSubscriptionUpdater.merge(preExistingEntity.id, create)
  }

  await subscriptionUpdatedMembershipHandler.handle(updatedSubscription.id);
}

export const webhookSubscriptionUpserter = {
  upsert,
}