import {Stripe} from "stripe";
import {getStripe} from "../../../external-lib/Stripe";
import {PriceEntity} from "../price/PriceEntity";
import {Create} from "../../../database/Entity";
import {priceRetriever} from "../price/PriceRetriever";
import {basePriceCreator, basePriceUpdater} from "../price/PriceRepository";
import {extractId, extractNonNullId} from "../StripeIdExtractor";
import {timestampToMoment} from "../../../tools/TimeConverter";
import {logger} from "firebase-functions";
import {TimestampStatic} from "../../../external-lib/Firebase";


const upsert = async (event:Stripe.Event, stripePrice:Stripe.Price):Promise<void> => {
  let price = stripePrice;
  if (price.billing_scheme === 'tiered') {
    price = await getStripe().prices.retrieve(price.id, { expand: ['tiers'] });
  }

  const create:Create<PriceEntity> = {
    stripePriceId: price.id,
    mostRecentEventTimestamp: TimestampStatic.fromMillis(event.created * 1000),
    active: price.active,
    billingScheme: price.billing_scheme,
    tiersMode: price.tiers_mode,
    tiers: price.tiers ?? null,
    unitAmount: price.unit_amount,
    currency: price.currency,
    description: price.nickname,
    productId: extractNonNullId(price.product),
    type: price.type,
    recurring: price.recurring,
    interval: price.recurring?.interval ?? null,
    intervalCount: price.recurring?.interval_count ?? null,
    trialPeriodDays: price.recurring?.trial_period_days ?? null,
    transformQuantity: price.transform_quantity,
    metadata: price.metadata,
    rawEvent: price,
  }

  const preExistingEntity = await priceRetriever.retrieveOptionalByStripePriceId(price.id);
  if (!preExistingEntity) {
    logger.info(`Creating new price with stripe price id: ${create.stripePriceId}`)
    await basePriceCreator.create(create);
  } else {
    const lastUpdate = timestampToMoment(preExistingEntity.mostRecentEventTimestamp)
    const currentUpdate = timestampToMoment(create.mostRecentEventTimestamp)
    if (lastUpdate.isSameOrAfter(currentUpdate)) {
      logger.info(`Skipping price update with id: ${preExistingEntity.id}, ${lastUpdate.toISOString()} >= ${currentUpdate.toISOString()}`)
      return;
    }

    await basePriceUpdater.merge(preExistingEntity.id, create)
  }
}

export const webhookPriceUpserter = {
  upsert,
}