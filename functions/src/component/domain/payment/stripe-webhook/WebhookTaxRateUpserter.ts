import {Stripe} from "stripe";
import {Create} from "../../../database/Entity";
import {TaxRateEntity} from "../tax-rate/TaxRateEntity";
import {baseTaxRateCreator, baseTaxRateUpdater} from "../tax-rate/TaxRateRepository";
import {taxRateRetriever} from "../tax-rate/TaxRateRetriever";
import {timestampToMoment} from "../../../tools/TimeConverter";
import {logger} from "firebase-functions";
import {TimestampStatic} from "../../../external-lib/Firebase";


const upsert = async (event:Stripe.Event, taxRate:Stripe.TaxRate):Promise<void> => {

  const create:Create<TaxRateEntity> = {
    active: taxRate.active,
    stripeTaxRateId: taxRate.id,
    mostRecentEventTimestamp: TimestampStatic.fromMillis(event.created * 1000),
    displayName: taxRate.display_name,
    description: taxRate.description,
    country: taxRate.country,
    created: TimestampStatic.fromMillis(taxRate.created * 1000),
    inclusive: taxRate.inclusive,
    jurisdiction: taxRate.jurisdiction,
    metadata: taxRate.metadata,
    percentage: taxRate.percentage,
    state: taxRate.state,
    taxType: taxRate.tax_type ?? null,
    rawEvent: taxRate,
  }

  const preExistingEntity = await taxRateRetriever.retrieveOptionalByStripeTaxRateId(taxRate.id);
  if (!preExistingEntity) {
    await baseTaxRateCreator.create(create);
  } else {
    const lastUpdate = timestampToMoment(preExistingEntity.mostRecentEventTimestamp)
    const currentUpdate = timestampToMoment(create.mostRecentEventTimestamp)
    if (lastUpdate.isSameOrAfter(currentUpdate)) {
      logger.info(`Skipping tax rate update with id: ${preExistingEntity.id}, ${lastUpdate.toISOString()} >= ${currentUpdate.toISOString()}`)
      return;
    }
    await baseTaxRateUpdater.merge(preExistingEntity.id, create)
  }
}

export const webhookTaxRateUpserter = {
  upsert,
}