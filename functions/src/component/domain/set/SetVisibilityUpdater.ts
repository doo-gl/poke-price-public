import {SetEntity} from "./SetEntity";
import {setRetriever} from "./SetRetriever";
import {setUpdater} from "./SetUpdater";
import {cardCollectionRetriever} from "../card-collection/CardCollectionRetriever";
import {collectionVisibilityUpdater} from "../card-collection/CollectionVisibilityUpdater";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {BatchUpdate} from "../../database/mongo/MongoEntity";
import {ItemEntity, itemRepository} from "../item/ItemEntity";

const update = async (setId:string, visible:boolean):Promise<SetEntity> => {
  const set = await setRetriever.retrieve(setId);
  const cardsInSet = await cardItemRetriever.retrieveBySetId(set.id);
  const updates:Array<BatchUpdate<ItemEntity>> = []
  cardsInSet.forEach(card => {
    updates.push({
      id: card._id,
      update: { visible },
    })
  })
  await itemRepository.batchUpdate(updates)
  // todo - finish the update many card visibility updater

  const collection = await cardCollectionRetriever.retrieveByIdempotencyKey(set.id);
  if (collection) {
    await collectionVisibilityUpdater.updateVisibility(collection.id, visible);
  }

  if (set.visible === visible) {
    return set;
  }
  const updatedSet = await setUpdater.update(set.id, { visible });

  return updatedSet;
}

export const setVisibilityUpdater = {
  update,
}