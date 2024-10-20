import {Stripe} from "stripe";
import {productRetriever} from "../product/ProductRetriever";
import {ProductEntity} from "../product/ProductEntity";
import {Create} from "../../../database/Entity";
import {baseProductCreator, baseProductUpdater} from "../product/ProductRepository";
import {timestampToMoment} from "../../../tools/TimeConverter";
import {logger} from "firebase-functions";
import {Timestamp, TimestampStatic} from "../../../external-lib/Firebase";


const upsert = async (event:Stripe.Event, product:Stripe.Product):Promise<void> => {

  const create:Create<ProductEntity> = {
    active: product.active,
    name: product.name,
    stripeProductId: product.id,
    mostRecentEventTimestamp: TimestampStatic.fromMillis(event.created * 1000),
    description: product.description,
    imageUrls: product.images,
    role: product.metadata['firebaseRole'] ?? null,
    metadata: product.metadata,
    rawEvent: product,
  }

  const preExistingEntity = await productRetriever.retrieveOptionalByStripeProductId(product.id);
  if (!preExistingEntity) {
    await baseProductCreator.create(create);
  } else {
    const lastUpdate = timestampToMoment(preExistingEntity.mostRecentEventTimestamp)
    const currentUpdate = timestampToMoment(create.mostRecentEventTimestamp)
    if (lastUpdate.isSameOrAfter(currentUpdate)) {
      logger.info(`Skipping product update with id: ${preExistingEntity.id}, ${lastUpdate.toISOString()} >= ${currentUpdate.toISOString()}`)
      return;
    }
    await baseProductUpdater.merge(preExistingEntity.id, create)
  }
}

export const webhookProductUpserter = {
  upsert,
}