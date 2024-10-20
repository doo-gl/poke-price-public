import {BY_PRIORITY_DESC, CardCollectionEntity} from "./CardCollectionEntity";
import {byIdRetriever} from "../../database/ByIdRetriever";
import {cardCollectionRepository} from "./CardCollectionRepository";
import {convertToKey} from "../../tools/KeyConverter";
import {batchIds, Query, SortOrder} from "../../database/BaseCrudRepository";
import {flattenArray} from "../../tools/ArrayFlattener";
import {singleResultRepoQuerier} from "../../database/SingleResultRepoQuerier";
import {toInputValueMap} from "../../tools/MapBuilder";
import {OwnershipFilter} from "./PublicCardCollectionDtoRetriever";
import {CardCollectionOwnershipEntity} from "./CardCollectionOwnershipEntity";
import {userContext} from "../../infrastructure/UserContext";
import {cardCollectionOwnershipRetriever} from "./CardCollectionOwnershipRetriever";
import {toInputValueSet, toSet} from "../../tools/SetBuilder";


const retrieve = (id:string):Promise<CardCollectionEntity> => {
  return byIdRetriever.retrieve(
    cardCollectionRepository,
    id,
    cardCollectionRepository.collectionName
  );
}

const retrieveOptional = (id:string):Promise<CardCollectionEntity|null> => {
  return cardCollectionRepository.getOne(id)
}

const retrieveByIdempotencyKey = (idempotencyKey:string) => {
  return singleResultRepoQuerier.query(
    cardCollectionRepository,
    [{ name: "idempotencyKey", value: idempotencyKey }],
    cardCollectionRepository.collectionName,
  )
}

const retrieveForCardIds = async (cardIds:Array<string>) => {
  const idBatches:Array<Array<string>> = batchIds(cardIds)
  const resultBatches:Array<Array<CardCollectionEntity>> = await Promise.all(
    idBatches.map((idBatch) => {
      return cardCollectionRepository.getMany([
        { field: "cardIds", operation: "array-contains-any", value: idBatch },
      ])
    }),
  );
  const results = flattenArray(resultBatches);
  const dedupedResults = toInputValueMap(results, collection => collection.id);
  return [...dedupedResults.values()];
}

const retrieveVisibleByIds = async (ids:Array<string>):Promise<Array<CardCollectionEntity>> => {
  const idBatches:Array<Array<string>> = batchIds(ids)
  const resultBatches:Array<Array<CardCollectionEntity>> = await Promise.all(
    idBatches.map((idBatch) => {
      return cardCollectionRepository.getMany([
        { field: "id", operation: "in", value: idBatch },
        { field: "visible", operation: "==", value: true },
      ])
    }),
  );
  const results = flattenArray(resultBatches);
  return results;
}

const retrieveVisibleRootsByIds = async (ids:Array<string>):Promise<Array<CardCollectionEntity>> => {
  const idBatches:Array<Array<string>> = batchIds(ids)
  const resultBatches:Array<Array<CardCollectionEntity>> = await Promise.all(
    idBatches.map((idBatch) => {
      return cardCollectionRepository.getMany([
        { field: "id", operation: "in", value: idBatch },
        { field: "visible", operation: "==", value: true },
        { field: "parentCollectionId", operation: "==", value: null },
      ])
    }),
  );
  const results = flattenArray(resultBatches);
  return results;
}



const retrieveVisibleByParentCollectionId = (id:string):Promise<Array<CardCollectionEntity>> => {
  return cardCollectionRepository.getMany([
    { field: "visible", operation: "==", value: true },
    { field: "parentCollectionId", operation: "==", value: id },
  ])
}

const retrieveByParentCollectionId = (id:string):Promise<Array<CardCollectionEntity>> => {
  return cardCollectionRepository.getMany([
    { field: "parentCollectionId", operation: "==", value: id },
  ])
}

const retrieveParent = async (id:string):Promise<CardCollectionEntity> => {
  const collection = await retrieve(id);
  if (collection.parentCollectionId === null) {
    return collection;
  }
  return retrieveParent(collection.parentCollectionId);
}

const retrieveVisibleDescendants = async (id:string):Promise<Array<CardCollectionEntity>> => {
  const children = await retrieveVisibleByParentCollectionId(id);
  return Promise.all(
    children.map(child => retrieveVisibleDescendants(child.id))
  )
    .then(results => {
      const flattenedCollections = flattenArray(results);
      return children.concat(flattenedCollections)
    })
}

const retrieveDescendants = async (id:string):Promise<Array<CardCollectionEntity>> => {
  const children = await retrieveByParentCollectionId(id);
  return Promise.all(
    children.map(child => retrieveDescendants(child.id))
  )
    .then(results => {
      const flattenedCollections = flattenArray(results);
      return children.concat(flattenedCollections)
    })
}

const retrieveVisibleParentWithDescendants = async (id:string):Promise<Array<CardCollectionEntity>> => {
  return Promise.all([
    retrieveVisibleByIds([id]),
    retrieveVisibleDescendants(id),
  ])
    .then(results => {
      return results[0].concat(results[1])
    })
}

const retrieveVisibleParentsBySearchKey = async (searchKey:string, ownershipFilter:OwnershipFilter|null):Promise<Array<CardCollectionEntity>> => {
  let collectionOwnerships:Array<CardCollectionOwnershipEntity> = [];
  const user = userContext.getUser();
  if (user && (ownershipFilter === OwnershipFilter.OWNED || ownershipFilter === OwnershipFilter.NEED)) {
    collectionOwnerships = await cardCollectionOwnershipRetriever.retrieveByUserId(user.id)
  }

  const ownedCollectionIds = toSet(collectionOwnerships, input => input.cardCollectionId)
  const key = convertToKey(searchKey);

  const queries:Array<Query<CardCollectionEntity>> = [
    { field: "visible", operation: "==", value: true },
    { field: "parentCollectionId", operation: "==", value: null },
  ];
  const sortField:(keyof CardCollectionEntity)|string = 'name';
  const sortDirection = SortOrder.DESC;

  // poor mans name search
  // essentially just doing a prefix search for names between search key and search key + zzzzzzzzzzzzzzzzzzzzzzzzzzzz
  // should be replaced with an actual search when there is time
  queries.push({ field: "name", operation: ">=", value: key });
  queries.push({ field: "name", operation: "<=", value: `${key}zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz` });

  const collections = await cardCollectionRepository.getMany(
    queries,
    {
      limit: 100,
      sort: [ {field: sortField, order: sortDirection} ],
    }
  )

  const filteredCollections = collections.filter(collection => {
    if (ownershipFilter === OwnershipFilter.NEED) {
      return !ownedCollectionIds.has(collection.id)
    }
    if (ownershipFilter === OwnershipFilter.OWNED) {
      return ownedCollectionIds.has(collection.id)
    }
    return true;
  })

  return filteredCollections.sort(BY_PRIORITY_DESC);
}

const retrieveVisibleTop = async (fromId:string|null):Promise<Array<CardCollectionEntity>> => {
  return cardCollectionRepository.getMany(
    [
      { field: 'visible', operation: "==", value: true },
      { field: 'parentCollectionId', operation: "==", value: null },
    ],
    {
      limit: 40,
      sort: [ {field: 'priority', order: SortOrder.DESC} ],
      startAfterId: fromId ? fromId : undefined,
    }
  )
}

const retrieveAllParents = ():Promise<Array<CardCollectionEntity>> => {
  return cardCollectionRepository.getMany(
    [
      { field: 'visible', operation: "==", value: true },
      { field: 'parentCollectionId', operation: "==", value: null },
    ],
  )
}

const retrieveVisibleTopWithFilter = async (
  fromId:string|null,
  isNeededCollectionPredicate:(collection:CardCollectionEntity) => boolean
):Promise<Array<CardCollectionEntity>> => {

  let retrieveCallCount = 0;
  let neededCollections:Array<CardCollectionEntity> = [];
  let allCollections:Array<CardCollectionEntity> = []

  // fetch collections in batches progressively adding more to the needed collections
  // once the needed collections reaches a particular length
  // or we have called more than a max amount, return the needed collections
  const retrieveNeeded = async ():Promise<Array<CardCollectionEntity>> => {
    if (retrieveCallCount > 5 || neededCollections.length > 20) {
      return neededCollections
    }
    retrieveCallCount++;
    const from = allCollections.length > 0
      ? allCollections[allCollections.length - 1].id
      : fromId;
    const nextCollections = await retrieveVisibleTop(from)
    allCollections = allCollections.concat(nextCollections)
    neededCollections = neededCollections.concat(nextCollections.filter(collection => isNeededCollectionPredicate(collection)));
    // neededCollections = neededCollections.concat(nextCollections.filter(collection => !collectionIdsToFind.has(collection.id)));
    return retrieveNeeded()
  }

  return retrieveNeeded()
}

const retrieveVisibleTopForOwnership = async (fromId:string|null, ownershipFilter:OwnershipFilter|null):Promise<Array<CardCollectionEntity>> => {

  let collectionOwnerships:Array<CardCollectionOwnershipEntity> = [];
  const user = userContext.getUser();
  const ownedFilterTypes = toInputValueSet([
    OwnershipFilter.OWNED,
    OwnershipFilter.NEED,
  ])
  if (user && ownershipFilter && (ownedFilterTypes.has(ownershipFilter))) {
    collectionOwnerships = await cardCollectionOwnershipRetriever.retrieveByUserId(user.id)
  }

  if (ownershipFilter === OwnershipFilter.OWNED) {
    const collections = await retrieveVisibleRootsByIds(collectionOwnerships.map(ownership => ownership.cardCollectionId))
    return collections.sort(BY_PRIORITY_DESC)
  }
  if (ownershipFilter === OwnershipFilter.NEED && collectionOwnerships.length > 0) {
    const ownedCollectionIds = toSet(collectionOwnerships, col => col.cardCollectionId)
    return retrieveVisibleTopWithFilter(fromId, collection => !ownedCollectionIds.has(collection.id))
  }

  return retrieveVisibleTop(fromId)
}

const retrieveOptionalByIdempotencyKey = (idempotencyKey:string):Promise<CardCollectionEntity|null> => {
  return singleResultRepoQuerier.query(
    cardCollectionRepository,
    [{name: "idempotencyKey", value: idempotencyKey}],
    cardCollectionRepository.collectionName,
  )
}

const retrieveByStatsLastUpdatedAsc = async (limit:number):Promise<Array<CardCollectionEntity>> => {
  return cardCollectionRepository.getMany(
    [],
    {
      limit,
      sort: [{field: "statsV2.lastUpdatedAt", order: SortOrder.ASC}],
    }
  )
}

export const cardCollectionRetriever = {
  retrieve,
  retrieveOptional,
  retrieveByIdempotencyKey,
  retrieveForCardIds,
  retrieveParent,
  retrieveByParentCollectionId,
  retrieveDescendants,
  retrieveVisibleByIds,
  retrieveVisibleRootsByIds,
  retrieveVisibleByParentCollectionId,
  retrieveVisibleDescendants,
  retrieveVisibleParentWithDescendants,
  retrieveVisibleParentsBySearchKey,
  retrieveVisibleTop,
  retrieveVisibleTopForOwnership,
  retrieveAllParents,
  retrieveOptionalByIdempotencyKey,
  retrieveByStatsLastUpdatedAsc,
}