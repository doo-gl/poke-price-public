import {cardCollectionRetriever} from "./CardCollectionRetriever";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {toInputValueSet} from "../../tools/SetBuilder";
import {baseCardCollectionUpdater} from "./CardCollectionRepository";
import {collectionVisibilityUpdater} from "./CollectionVisibilityUpdater";
import {collectionStatsUpdater} from "./CollectionStatsUpdater";


const addCards = async (collectionId:string, cardIds:Array<string>):Promise<void> => {
  const collection = await cardCollectionRetriever.retrieve(collectionId);
  const childCollections = await cardCollectionRetriever.retrieveDescendants(collectionId);
  if (childCollections.length > 0) {
    throw new InvalidArgumentError(`Collection: ${collectionId} has children, cannot adds cards to a parent collection`);
  }
  const cardIdSet = toInputValueSet(collection.cardIds);
  cardIds.forEach(cardId => cardIdSet.add(cardId))
  const newCardIds = [...cardIdSet.values()].sort();
  await baseCardCollectionUpdater.updateOnly(collection.id, { cardIds: newCardIds });
  await collectionStatsUpdater.update(collection.id);
}

export const collectionCardAdder = {
  addCards,
}