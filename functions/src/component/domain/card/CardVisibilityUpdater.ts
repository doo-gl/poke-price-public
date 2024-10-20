import {collectionVisibilityUpdater} from "../card-collection/CollectionVisibilityUpdater";
import {cardCollectionRetriever} from "../card-collection/CardCollectionRetriever";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {ItemEntity, itemUpdater} from "../item/ItemEntity";
import {collectionStatsUpdater} from "../card-collection/CollectionStatsUpdater";

const update = async (cardId:string, visible:boolean):Promise<ItemEntity> => {
  const card = await cardItemRetriever.retrieve(cardId);
  if (card.visible === visible) {
    return card;
  }
  const updatedCard = await itemUpdater.updateAndReturn(card._id, { visible });
  const collections = await cardCollectionRetriever.retrieveForCardIds([cardId])
  const parentCollections = collections.filter(collection => !collection.parentCollectionId);
  await Promise.all(
    parentCollections.map(collection => collectionStatsUpdater.update(collection.id))
  )
  return updatedCard;
}

export const cardVisibilityUpdater = {
  update,
}