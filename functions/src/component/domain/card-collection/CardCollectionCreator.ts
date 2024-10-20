import {CardCollectionEntity} from "./CardCollectionEntity";
import {Create, Update} from "../../database/Entity";
import {cardCollectionRetriever} from "./CardCollectionRetriever";
import {baseCardCollectionCreator, baseCardCollectionUpdater} from "./CardCollectionRepository";
import {lodash} from "../../external-lib/Lodash";
import {dedupe} from "../../tools/ArrayDeduper";
import {collectionStatsUpdater} from "./CollectionStatsUpdater";

const updateCollection = async (newCollection:Create<CardCollectionEntity>, preExistingCollection:CardCollectionEntity):Promise<CardCollectionEntity> => {

  const update:Update<CardCollectionEntity> = {}

  if (!lodash.areArraysEqual(newCollection.cardIds.sort(), preExistingCollection.cardIds.sort())) {
    const newCardIds = dedupe(preExistingCollection.cardIds.concat(newCollection.cardIds), i => i)
    update.cardIds = newCardIds.sort()
  }
  if (!lodash.areArraysEqual(newCollection.visibleCardIds.sort(), preExistingCollection.visibleCardIds.sort())) {
    const newCardIds = dedupe(preExistingCollection.visibleCardIds.concat(newCollection.visibleCardIds), i => i)
    update.visibleCardIds = newCardIds.sort()
  }

  if (Object.keys(update).length > 0) {
    const result = await baseCardCollectionUpdater.updateAndReturn(preExistingCollection.id, update)
    await collectionStatsUpdater.update(result.id)
    return result
  } else {
    return preExistingCollection
  }

}

const create = async (newCollection:Create<CardCollectionEntity>):Promise<CardCollectionEntity> => {
  const preExistingCollection = await cardCollectionRetriever.retrieveOptionalByIdempotencyKey(newCollection.idempotencyKey);
  if (preExistingCollection) {
    return await updateCollection(newCollection, preExistingCollection);
  }
  return baseCardCollectionCreator.create(newCollection);
}

export const cardCollectionCreator = {
  create,
}