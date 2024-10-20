import {cardCollectionOwnershipRetriever} from "../../card-collection/CardCollectionOwnershipRetriever";
import {cardCollectionOwnershipRepository} from "../../card-collection/CardCollectionOwnershipRepository";
import {Create} from "../../../database/Entity";
import {CardCollectionOwnershipEntity} from "../../card-collection/CardCollectionOwnershipEntity";
import {difference, union} from "../../../tools/SetOperations";
import {toInputValueSet} from "../../../tools/SetBuilder";
import {FieldValue} from "../../../external-lib/Firebase";

const markCollectionAsOwned = async (userId:string, collectionId:string, cardIdsToMarkAsOwned:Array<string>):Promise<void> => {
  const preExistingCollectionOwnershipOutsideTransaction = await cardCollectionOwnershipRetriever.retrieveOptionalByUserIdAndCollectionId(
    userId, collectionId
  )

  await cardCollectionOwnershipRepository.getFirestoreDatabase().runTransaction(async transaction => {
    const collectionRef = cardCollectionOwnershipRepository.getFirebaseCollection()
    const collectionDocRef = preExistingCollectionOwnershipOutsideTransaction
      ? collectionRef.doc(preExistingCollectionOwnershipOutsideTransaction.id)
      : null;
    const preExistingCollectionOwnershipDoc = collectionDocRef
      ? await transaction.get(collectionDocRef)
      : null
    const preExistingCollectionOwnership = cardCollectionOwnershipRepository.convert(preExistingCollectionOwnershipDoc?.data())

    if (!preExistingCollectionOwnership || !collectionDocRef) {
      const ownershipCreateEntity:Create<CardCollectionOwnershipEntity> = {
        cardCollectionId: collectionId,
        userId,
        ownedCardIds: cardIdsToMarkAsOwned,
      }
      const newOwnershipEntity = cardCollectionOwnershipRepository.mapCreateToEntity(ownershipCreateEntity)
      await transaction.set(collectionRef.doc(newOwnershipEntity.id), newOwnershipEntity)
    } else {
      const newOwnedCards = [...union(
        toInputValueSet(preExistingCollectionOwnership.ownedCardIds),
        toInputValueSet(cardIdsToMarkAsOwned)
      ).values()].sort()
      const dateLastModified = FieldValue.serverTimestamp();
      const updateValue = { ownedCardIds: newOwnedCards, dateLastModified };
      await transaction.update(collectionDocRef, updateValue)
    }
  })
}

const markCollectionAsNotOwned = async (userId:string, collectionId:string, cardIdsToMarkAsNotOwned:Array<string>):Promise<void> => {
  const preExistingCollectionOwnershipOutsideTransaction = await cardCollectionOwnershipRetriever.retrieveOptionalByUserIdAndCollectionId(
    userId, collectionId
  )

  await cardCollectionOwnershipRepository.getFirestoreDatabase().runTransaction(async transaction => {
    const collectionRef = cardCollectionOwnershipRepository.getFirebaseCollection()
    const collectionDocRef = preExistingCollectionOwnershipOutsideTransaction
      ? collectionRef.doc(preExistingCollectionOwnershipOutsideTransaction.id)
      : null;
    const preExistingCollectionOwnershipDoc = collectionDocRef
      ? await transaction.get(collectionDocRef)
      : null
    const preExistingCollectionOwnership = cardCollectionOwnershipRepository.convert(preExistingCollectionOwnershipDoc?.data())

    if (!preExistingCollectionOwnership || !collectionDocRef) {
      // nothing to do
    } else {
      const newOwnedCards = [...difference(
        toInputValueSet(preExistingCollectionOwnership.ownedCardIds),
        toInputValueSet(cardIdsToMarkAsNotOwned)
      ).values()].sort()
      if (newOwnedCards.length > 0) {
        const dateLastModified = FieldValue.serverTimestamp();
        const updateValue = { ownedCardIds: newOwnedCards, dateLastModified };
        await transaction.update(collectionDocRef, updateValue)
      } else {
        await transaction.delete(collectionDocRef)
      }

    }
  })
}


export const transactionalCollectionOwnershipMarker = {
  markCollectionAsNotOwned,
  markCollectionAsOwned,
}

