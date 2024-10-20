import {cardCollectionRetriever} from "./CardCollectionRetriever";
import {baseCardCollectionUpdater} from "./CardCollectionRepository";
import {BatchUpdate as MongoBatchUpdate} from "../../database/mongo/MongoEntity"

import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {ItemEntity, itemRepository} from "../item/ItemEntity";
import {collectionStatsUpdater} from "./CollectionStatsUpdater";

const updateVisibility = async (collectionId:string, isVisible:boolean) => {

  const collection = await cardCollectionRetriever.retrieve(collectionId);
  await baseCardCollectionUpdater.updateOnly(collection.id, { visible: isVisible })
  const children = await cardCollectionRetriever.retrieveDescendants(collection.id)
  await Promise.all(children.map(child => baseCardCollectionUpdater.updateOnly(child.id, { visible: isVisible })))
  await collectionStatsUpdater.update(collection.id);
}

const makeVisibleWithCards = async (collectionId:string):Promise<void> => {
  const collection = await cardCollectionRetriever.retrieve(collectionId);
  if (collection.parentCollectionId) {
    throw new InvalidArgumentError(`Collection: ${collectionId} is a child`)
  }
  const cards = await cardItemRetriever.retrieveByIds(collection.cardIds)
  const cardUpdates:Array<MongoBatchUpdate<ItemEntity>> = []
  cards.forEach(card => {
    cardUpdates.push({ id: card._id, update: { visible: true } })
  })
  await itemRepository.batchUpdate(cardUpdates)
  await makeVisible(collectionId)
}

const makeNotVisibleWithCards = async (collectionId:string):Promise<void> => {
  const collection = await cardCollectionRetriever.retrieve(collectionId);
  if (collection.parentCollectionId) {
    throw new InvalidArgumentError(`Collection: ${collectionId} is a child`)
  }
  const cards = await cardItemRetriever.retrieveByIds(collection.cardIds)
  const cardUpdates:Array<MongoBatchUpdate<ItemEntity>> = []
  cards.forEach(card => {
    cardUpdates.push({ id: card._id, update: { visible: false } })
  })
  await itemRepository.batchUpdate(cardUpdates)
  await makeNotVisible(collectionId)
}

const makeVisible = async (collectionId:string) => {
  return updateVisibility(collectionId, true);
}

const makeNotVisible = async (collectionId:string) => {
  return updateVisibility(collectionId, false);
}

export const collectionVisibilityUpdater = {
  makeVisible,
  makeNotVisible,
  makeVisibleWithCards,
  makeNotVisibleWithCards,
  updateVisibility,
}