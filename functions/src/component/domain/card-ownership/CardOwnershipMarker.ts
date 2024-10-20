import {userContext} from "../../infrastructure/UserContext";
import {NotAuthorizedError} from "../../error/NotAuthorizedError";
import {cardOwnershipRetriever} from "./CardOwnershipRetriever";
import {cardOwnershipRepository} from "./CardOwnershipRepository";
import {CardOwnershipEntity, OwnershipType} from "./CardOwnershipEntity";
import {JSONSchemaType} from "ajv";
import {Create} from "../../database/Entity";
import {toInputValueMap} from "../../tools/MapBuilder";
import {logger} from "firebase-functions";
import {cardCollectionRetriever} from "../card-collection/CardCollectionRetriever";
import {cardCollectionOwnershipRetriever} from "../card-collection/CardCollectionOwnershipRetriever";
import {toInputValueSet} from "../../tools/SetBuilder";
import {
  baseCardCollectionOwnershipCreator,
  cardCollectionOwnershipRepository,
} from "../card-collection/CardCollectionOwnershipRepository";
import {difference, union} from "../../tools/SetOperations";
import {UserEntity} from "../user/UserEntity";
import {userRetriever} from "../user/UserRetriever";
import {inventoryItemCreator} from "../inventory/InventoryItemCreator";
import {inventoryItemDeleter} from "../inventory/InventoryItemDeleter";
import {itemRetriever} from "../item/ItemRetriever";
import {legacyIdOrFallback} from "../item/ItemEntity";
import {transactionalCollectionOwnershipMarker} from "./transactional/TransactionalCollectionOwnershipMarker";
import {portfolioStatsRecalculator} from "../portfolio/PortfolioStatsRecalculator";

export interface MarkRequest {
  cardIds:Array<string>
}
export const markRequestSchema:JSONSchemaType<MarkRequest> = {
  type: "object",
  properties: {
    cardIds: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
  required: ["cardIds"],
}

const mapRequestCardIdsToLegacyOrFallbackIds = async (cardIds:Array<string>):Promise<Array<string>> => {
  const items = await itemRetriever.retrieveManyByIdOrLegacyId(cardIds);
  return items.map(item => legacyIdOrFallback(item))
}

const syncUserCollections = async (userId:string):Promise<void> => {
  // find all card ownerships for user
  // find all collection ownerships for user
  // find all collections for the collection ownerships
  // for each collection ownership
  // - find the collection
  // - check which cards in that collection the user owns
  // - update collection ownership
  // - keep track of duplicate collection ownerships tracking the same collection
  // batch save collection ownerships
}

const syncUserCollection = async (userId:string, collectionId:string):Promise<void> => {
  // find collection
  // find all collection ownerships
  // find all card ownerships for collection
  // if there are multiple ownerships, delete all but the least recent
  // ensure the item ids in the collection match the owned ones
}

// const transactionalMarkCollectionAsOwned = async (userId:string, cardIds:Array<string>, collections:Array<CardCollectionEntity>) => {
//   const collectionIds = collections.map(col => col.id)
//   const firestore = cardCollectionOwnershipRepository.db
//   const firestoreCollection = cardCollectionOwnershipRepository.getFirebaseCollection()
//   await firestore.runTransaction(async (transaction) => {
//     const collectionIdBatches = batchIds(collectionIds)
//     const collectionOwnershipResults = await Promise.all(collectionIdBatches.map(async idBatch => {
//         const results = await transaction.get(
//           firestoreCollection
//             .where("userId", "==", userId)
//             .where("cardCollectionId", "in", idBatch)
//         )
//         return removeNulls(results.docs.map(res => cardCollectionOwnershipRepository.convert(res)))
//       }
//     ))
//     const collectionOwnerships = flattenArray(collectionOwnershipResults)
//
//     const collectionIdToOwnership = toInputValueMap(collectionOwnerships, ownership => ownership.cardCollectionId);
//     const ownedCardIdSet = toInputValueSet(cardIds);
//
//     const ownershipCreates:Array<Create<CardCollectionOwnershipEntity>> = [];
//     const ownershipUpdates:Array<BatchUpdate<CardCollectionOwnershipEntity>> = [];
//
//     await wait(Math.random() * 10000)
//
//     collections.forEach(collection => {
//       const ownership = collectionIdToOwnership.get(collection.id);
//       const cardIdsToMarkAsOwned = collection.cardIds.filter(cardId => ownedCardIdSet.has(cardId));
//
//       if (!ownership) {
//         ownershipCreates.push({
//           cardCollectionId: collection.id,
//           userId,
//           ownedCardIds: cardIdsToMarkAsOwned,
//         })
//       } else {
//         const newOwnedCards = [...union(
//           toInputValueSet(ownership.ownedCardIds),
//           toInputValueSet(cardIdsToMarkAsOwned)
//         ).values()].sort()
//         ownershipUpdates.push({id: ownership.id, update: {ownedCardIds: newOwnedCards}})
//       }
//     })
//
//     await Promise.all(ownershipCreates.map(async create => {
//       const entity = cardCollectionOwnershipRepository.mapCreateToEntity(create)
//       const docRef = firestoreCollection.doc(entity.id)
//       await transaction.create(docRef, entity)
//     }))
//     await Promise.all(ownershipUpdates.map(async update => {
//       const docRef = firestoreCollection.doc(update.id)
//       const dateLastModified = FieldValue.serverTimestamp();
//       const updateValue = {
//         ...update.update,
//         dateLastModified
//       }
//       await transaction.update(docRef, updateValue)
//     }))
//   })
//
// }
//
// const markCollectionsAsOwnedV2 = async (userId:string, cardIds:Array<string>) => {
//   const collections = await cardCollectionRetriever.retrieveForCardIds(cardIds);
//   const dedupedCollections = [...toInputValueMap(collections, collection => collection.id).values()];
//   await transactionalMarkCollectionAsOwned(userId, cardIds, dedupedCollections)
// }


const markCollectionsAsOwned = async (userId:string, cardIds:Array<string>) => {
  // Find all the collections that match the card IDs
  const collections = await cardCollectionRetriever.retrieveForCardIds(cardIds);
  const dedupedCollections = [...toInputValueMap(collections, collection => collection.id).values()];

  // Find the collection ownerships for this user
  const collectionOwnerships = await cardCollectionOwnershipRetriever.retrieveByUserIdAndCollectionIds(
    userId,
    dedupedCollections.map(collection => collection.id)
  );
  const collectionIdToOwnership = toInputValueMap(collectionOwnerships, ownership => ownership.cardCollectionId);
  const ownedCardIdSet = toInputValueSet(cardIds);

  await Promise.all(dedupedCollections.map(async collection => {
    const cardIdsToMarkAsOwned = collection.cardIds.filter(cardId => ownedCardIdSet.has(cardId));
    await transactionalCollectionOwnershipMarker.markCollectionAsOwned(userId, collection.id, cardIdsToMarkAsOwned)

    // const preExistingCollectionOwnership = await cardCollectionOwnershipRetriever.retrieveOptionalByUserIdAndCollectionId(
    //   userId, collection.id
    // )
    // if (!preExistingCollectionOwnership) {
    //   await baseCardCollectionOwnershipCreator.create({
    //     cardCollectionId: collection.id,
    //     userId,
    //     ownedCardIds: cardIdsToMarkAsOwned,
    //   })
    // } else {
    //   const newOwnedCards = [...union(
    //     toInputValueSet(preExistingCollectionOwnership.ownedCardIds),
    //     toInputValueSet(cardIdsToMarkAsOwned)
    //   ).values()].sort()
    //   await cardCollectionOwnershipRepository.updateOnlyInTransaction(preExistingCollectionOwnership.id, {ownedCardIds: newOwnedCards})
    // }

  }))
}

const markCollectionsAsNotOwned = async (userId:string, cardIds:Array<string>) => {
  // Find all the collections that match the card IDs
  const collections = await cardCollectionRetriever.retrieveForCardIds(cardIds);
  const dedupedCollections = [...toInputValueMap(collections, collection => collection.id).values()];

  // Find the collection ownerships for this user
  const collectionOwnerships = await cardCollectionOwnershipRetriever.retrieveByUserIdAndCollectionIds(
    userId,
    dedupedCollections.map(collection => collection.id)
  );
  const collectionIdToOwnership = toInputValueMap(collectionOwnerships, ownership => ownership.cardCollectionId);
  const notOwnedCardIdSet = toInputValueSet(cardIds);

  await Promise.all(dedupedCollections.map(async collection => {
    const cardIdsToMarkAsNotOwned = collection.cardIds.filter(cardId => notOwnedCardIdSet.has(cardId));
    await transactionalCollectionOwnershipMarker.markCollectionAsNotOwned(userId, collection.id, cardIdsToMarkAsNotOwned)

    // const preExistingCollectionOwnership = await cardCollectionOwnershipRetriever.retrieveOptionalByUserIdAndCollectionId(
    //   userId, collection.id
    // )
    // const cardIdsToMarkAsNotOwned = collection.cardIds.filter(cardId => notOwnedCardIdSet.has(cardId));
    // if (!preExistingCollectionOwnership) {
    //   // nothing to do
    //   return
    // } else {
    //
    //   const newOwnedCards = [...difference(
    //     toInputValueSet(preExistingCollectionOwnership.ownedCardIds),
    //     toInputValueSet(cardIdsToMarkAsNotOwned)
    //   ).values()].sort()
    //   if (newOwnedCards.length > 0) {
    //     await cardCollectionOwnershipRepository.updateOnlyInTransaction(preExistingCollectionOwnership.id, {ownedCardIds: newOwnedCards})
    //   } else {
    //     await cardCollectionOwnershipRepository.delete(preExistingCollectionOwnership.id)
    //   }
    //
    // }

  }))
}

const markAsOwnedForUser = async (user:UserEntity, cardIds:Array<string>):Promise<Array<CardOwnershipEntity>> => {
  const userId = user.id;
  const mappedCardIds = await mapRequestCardIdsToLegacyOrFallbackIds(cardIds)
  const preExistingCardOwnerships = await cardOwnershipRetriever.retrieveCardsOwnedByUser(mappedCardIds, userId);
  const cardIdToCardOwnership = toInputValueMap(preExistingCardOwnerships, ownership => ownership.cardId);
  const cardIdsThatNeedOwnership:Array<string> = mappedCardIds.filter(cardId => !cardIdToCardOwnership.has(cardId));
  const creates:Array<Create<CardOwnershipEntity>> = cardIdsThatNeedOwnership.map(cardId => {
    return {
      cardId,
      userId,
      ownershipType: OwnershipType.OWNED,
      inventoryItemIds: [],
    }
  })
  if (creates.length > 0) {
    await cardOwnershipRepository.batchCreate(creates);
  }
  const createdOwnerships = await cardOwnershipRetriever.retrieveCardsOwnedByUser(cardIdsThatNeedOwnership, userId);
  const ownerships = preExistingCardOwnerships.concat(createdOwnerships)

  await markCollectionsAsOwned(userId, mappedCardIds)
  const newInventoryItems = await inventoryItemCreator.createFromOwnerships(user, ownerships)

  await portfolioStatsRecalculator.onInventoryItemsAddedV2(newInventoryItems, createdOwnerships)
  return ownerships
}

const markAsOwnedForUserId = async (userId:string, cardIds:Array<string>):Promise<Array<CardOwnershipEntity>> => {
  const user = await userRetriever.retrieve(userId)
  return markAsOwnedForUser(user, cardIds)
}

const markAsOwned = async (request:MarkRequest):Promise<Array<CardOwnershipEntity>> => {
  const user = userContext.getUser();
  if (!user) {
    throw new NotAuthorizedError(`No user`);
  }
  return markAsOwnedForUser(user, request.cardIds)
}

const markAsNotOwned = async (request:MarkRequest):Promise<Array<CardOwnershipEntity>> => {
  const user = userContext.getUser();
  if (!user) {
    throw new NotAuthorizedError(`No user`);
  }
  const cardIds = await mapRequestCardIdsToLegacyOrFallbackIds(request.cardIds);

  const userId = user.id;
  const preExistingCardOwnerships = await cardOwnershipRetriever.retrieveCardsOwnedByUser(cardIds, userId);
  const cardOwnershipIdsToDelete = preExistingCardOwnerships.map(ownership => ownership.id);

  await markCollectionsAsNotOwned(userId, cardIds)

  logger.info(`Deleting card ownership ids: ${cardOwnershipIdsToDelete.join(',')}, for user: ${userId}`)
  await cardOwnershipRepository.batchDelete(cardOwnershipIdsToDelete);
  const deletedInventoryItems = await inventoryItemDeleter.deleteFromItemIds(user, cardIds)
  await portfolioStatsRecalculator.onInventoryItemsRemovedV2(deletedInventoryItems, preExistingCardOwnerships)
  return []
}

export const cardOwnershipMarker = {
  markAsOwned,
  markAsNotOwned,
  markAsOwnedForUserId,
  markCollectionsAsOwned,
  markCollectionsAsNotOwned,
}