import {CardCollectionOwnershipEntity} from "./CardCollectionOwnershipEntity";
import {batchIds} from "../../database/BaseCrudRepository";
import {cardCollectionOwnershipRepository} from "./CardCollectionOwnershipRepository";
import {flattenArray} from "../../tools/ArrayFlattener";
import {userContext} from "../../infrastructure/UserContext";
import {singleResultRepoQuerier} from "../../database/SingleResultRepoQuerier";


const retrieveByUserIdAndCollectionIds = (userId:string, collectionIds:Array<string>):Promise<Array<CardCollectionOwnershipEntity>> => {
  const batchedCollectionIds = batchIds(collectionIds);
  return Promise.all(
    batchedCollectionIds.map(idBatch => {
      return cardCollectionOwnershipRepository.getMany([
        {field: "userId", operation: "==", value: userId},
        {field: "cardCollectionId", operation: "in", value: idBatch},
      ])
    })
  )
    .then(results => flattenArray(results));
}

const retrieveByUserId = (userId:string):Promise<Array<CardCollectionOwnershipEntity>> => {
  return cardCollectionOwnershipRepository.getMany([
    {field: "userId", operation: "==", value: userId},
  ])
}

const retrieveByCollectionIdsForCaller = async (collectionIds:Array<string>):Promise<Array<CardCollectionOwnershipEntity>> => {
  const user = userContext.getUser();
  if (!user) {
    return []
  }
  return retrieveByUserIdAndCollectionIds(user.id, collectionIds);
}

const retrieveOptionalByUserIdAndCollectionId = (userId:string, collectionId:string):Promise<CardCollectionOwnershipEntity|null> => {
  return singleResultRepoQuerier.query(
    cardCollectionOwnershipRepository,
    [
      { name: "userId", value: userId },
      { name: "cardCollectionId", value: collectionId },
    ],
    cardCollectionOwnershipRepository.collectionName
  )
}

export const cardCollectionOwnershipRetriever = {
  retrieveByUserIdAndCollectionIds,
  retrieveByCollectionIdsForCaller,
  retrieveOptionalByUserIdAndCollectionId,
  retrieveByUserId,
}