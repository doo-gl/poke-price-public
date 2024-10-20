import {setRepository} from "../set/SetRepository";
import {logger} from "firebase-functions";
import {cardCollectionRetriever} from "./CardCollectionRetriever";
import {UnexpectedError} from "../../error/UnexpectedError";
import {CardVariant} from "../card/CardEntity";
import {difference} from "../../tools/SetOperations";
import {baseCardCollectionUpdater} from "./CardCollectionRepository";
import {capitaliseKey} from "../../tools/KeyConverter";
import {collectionVisibilityUpdater} from "./CollectionVisibilityUpdater";
import {SetEntity} from "../set/SetEntity";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {toCard} from "../item/CardItem";
import {legacyIdOrFallback} from "../item/ItemEntity";
import {collectionStatsUpdater} from "./CollectionStatsUpdater";

const reconcileForSet = async (set:SetEntity) => {
  logger.info(`Processing set: ${set.id}`)
  const parentCollection = await cardCollectionRetriever.retrieveByIdempotencyKey(set.id);
  const standardCollection = await cardCollectionRetriever.retrieveByIdempotencyKey(`${set.id}|STANDARD`)
  const reverseHoloCollection = await cardCollectionRetriever.retrieveByIdempotencyKey(`${set.id}|REVERSE_HOLO`)
  if (!parentCollection || !standardCollection) {
    throw new UnexpectedError(`Failed to find collection for set: ${set.id}`)
  }
  const cards = await cardItemRetriever.retrieveBySetId(set.id);
  const standardSetCardIds = new Set<string>(
    cards.filter(card => toCard(card)?.variant === CardVariant.DEFAULT).map(card => legacyIdOrFallback(card))
  );
  const reverseHoloSetCardIds = new Set<string>(
    cards.filter(card => toCard(card)?.variant === CardVariant.REVERSE_HOLO).map(card => legacyIdOrFallback(card))
  );

  const standardCollectionCardIds = new Set<string>(standardCollection.cardIds);
  const reverseHoloCollectionCardIds = new Set<string>(reverseHoloCollection?.cardIds ?? []);

  const standardCardsMissingFromSet = difference(standardCollectionCardIds, standardSetCardIds)
  if (standardCardsMissingFromSet.size > 0) {
    throw new UnexpectedError(`Collection: ${standardCollection.id} contains cards that set: ${set.id} does not contain, ${[...standardCardsMissingFromSet].join(',')}`)
  }

  const reverseHoloCardsMissingFromSet = difference(reverseHoloCollectionCardIds, reverseHoloSetCardIds)
  if (reverseHoloCardsMissingFromSet.size > 0) {
    throw new UnexpectedError(`Collection: ${reverseHoloCollection?.id} contains cards that set: ${set.id} does not contain, ${[...reverseHoloCardsMissingFromSet].join(',')}`)
  }

  if (standardSetCardIds.size !== standardCollectionCardIds.size) {
    logger.info(`Standard collection: ${standardCollection.id} has ${standardCollectionCardIds.size} cards, vs ${standardSetCardIds.size} in the set`)
  }
  await baseCardCollectionUpdater.updateOnly(standardCollection.id, {
    cardIds: [...standardSetCardIds].sort(),
    displayName: capitaliseKey(set.name),
  })

  if (reverseHoloCollection) {
    if (reverseHoloSetCardIds.size !== reverseHoloCollectionCardIds.size) {
      logger.info(`Standard collection: ${reverseHoloCollection.id} has ${reverseHoloCollectionCardIds.size} cards, vs ${reverseHoloSetCardIds.size} in the set`)
    }
    await baseCardCollectionUpdater.updateOnly(reverseHoloCollection.id, {
      cardIds: [...reverseHoloSetCardIds].sort(),
      displayName: capitaliseKey(set.name),
    })
  }
  await collectionStatsUpdater.update(parentCollection.id)
  logger.info(`Processed set: ${set.id}`)
}

const reconcile = async () => {
  // go through each set making sure that the collections based on that set have the expected cards

  await setRepository.iterator()
    .batchSize(3)
    .iterate(async set => {
      await reconcileForSet(set)
    })
}

export const collectionSetCardReconciler = {
  reconcile,
  reconcileForSet,
}