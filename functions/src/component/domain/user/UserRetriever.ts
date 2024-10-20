import {UserEntity} from "./UserEntity";
import {byIdRetriever} from "../../database/ByIdRetriever";
import {userRepository} from "./UserRepository";
import {logger} from "firebase-functions";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {singleResultRepoQuerier} from "../../database/SingleResultRepoQuerier";
import {flattenArray} from "../../tools/ArrayFlattener";
import {batchIds, SortOrder} from "../../database/BaseCrudRepository";
import {dedupe} from "../../tools/ArrayDeduper";
import {Moment} from "moment";
import {momentToTimestamp} from "../../tools/TimeConverter";


const retrieve = (id:string):Promise<UserEntity> => {
  return byIdRetriever.retrieve(userRepository, id, userRepository.collectionName)
}

const retrieveOptional = (id:string):Promise<UserEntity|null> => {
  return userRepository.getOne(id);
}

const retrieveMany = async (ids:Array<string>):Promise<Array<UserEntity>> => {
  const idBatches = batchIds(ids)
  const resultBatches = await Promise.all(idBatches.map(idBatch => userRepository.getMany([{field: "id", operation: "in", value: idBatch}])))
  const flattenedResults = flattenArray(resultBatches)
  const dedupedResults = dedupe(flattenedResults, i => i.id)
  return dedupedResults
}

const retrieveByFirebaseUserId = async (firebaseUserId:string):Promise<UserEntity|null> => {
  const users = await userRepository.getMany([
    { field: "firebaseUserIds", operation: "array-contains", value: firebaseUserId },
  ]);
  if (users.length === 0) {
    return null;
  }
  const sortedResults = users.sort(comparatorBuilder.objectAttributeASC(user => user.dateCreated.toMillis()));
  if (users.length > 1) {
    logger.error(`Found ${sortedResults.length} results when looking for a user with firebaseUserId: ${firebaseUserId}, expected to find 1, only returning the first.
      Actual results: ${sortedResults.map(user => user.id).join(',')}`)
  }
  return sortedResults[0];
}

const retrieveByEmail = async (email:string):Promise<UserEntity|null> => {
  const users = await userRepository.getMany([
    { field: "details.email", operation: "==", value: email },
  ]);
  if (users.length === 0) {
    return null;
  }
  const sortedResults = users.sort(comparatorBuilder.objectAttributeASC(user => user.dateCreated.toMillis()));
  if (users.length > 1) {
    logger.error(`Found ${sortedResults.length} results when looking for a user with email, expected to find 1, only returning the first.
      Actual results: ${sortedResults.map(user => user.id).join(',')}`)
  }
  return sortedResults[0];
}

const retrieveByStripeCustomerId = (customerId:string):Promise<UserEntity|null> => {
  return singleResultRepoQuerier.query(
    userRepository,
    [{ name: "stripeDetails.stripeId", value: customerId }],
    userRepository.collectionName
  );
}

const retrieveRootParent = async (userId:string):Promise<UserEntity> => {
  const user = await retrieve(userId)
  if (!user.parentUserId) {
    return user;
  }
  return retrieveRootParent(user.parentUserId)
}

const retrieveChildUsers = async (userId:string):Promise<Array<UserEntity>> => {
  const directChildren = await userRepository.getMany([
    {field: "parentUserId", operation: "==", value: userId},
  ])
  if (directChildren.length === 0) {
    return []
  }
  const childrenOfChildren = flattenArray(await Promise.all(
    directChildren.map(child => retrieveChildUsers(child.id))
  ))
  return directChildren.concat(childrenOfChildren)
}

const retrieveAllConnectedUsers = async (userId:string):Promise<Array<UserEntity>> => {
  const rootUser = await retrieveRootParent(userId);
  const children = await retrieveChildUsers(rootUser.id)
  return [rootUser].concat(children)
}

const retrieveUsersByNextReactivationAsc = async (limit:number):Promise<Array<UserEntity>> => {
  return userRepository.getMany(
    [],
    {
      limit,
      sort: [{field: "nextReactivationAttempt", order: SortOrder.ASC}],
    }
  )
}

export const userRetriever = {
  retrieve,
  retrieveOptional,
  retrieveMany,
  retrieveByFirebaseUserId,
  retrieveByEmail,
  retrieveByStripeCustomerId,
  retrieveAllConnectedUsers,
  retrieveChildUsers,
  retrieveRootParent,
  retrieveUsersByNextReactivationAsc,
}