import {PublicCardCollectionDtoList} from "./CardCollectionDto";
import {cardCollectionRetriever} from "./CardCollectionRetriever";
import {cardCollectionOwnershipRetriever} from "./CardCollectionOwnershipRetriever";
import {cardCollectionMapper} from "./CardCollectionDtoMapper";
import {CardCollectionEntity} from "./CardCollectionEntity";
import {cacheBuilder} from "../../database/cache/Cache";
import {userContext} from "../../infrastructure/UserContext";
import {favouriteCollectionRetriever} from "./favourite/FavouriteCollectionRetriever";
import {dedupeInOrder} from "../../tools/ArrayDeduper";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";

export enum OwnershipFilter {
  ALL = 'ALL',
  OWNED = 'OWNED',
  NEED = 'NEED',
}

export interface CardCollectionRetrieveRequest {
  searchKey:string|null,
  cardCollectionId:Array<string>|null,
  parentCollectionId:string|null,
  setId:string|null,
  fromId:string|null,
  ownershipFilter:OwnershipFilter|null,
  includeFavourites:boolean|null,
}

const CACHE_ENTRY_TYPE = 'CARD_COLLECTION_ENTITY';

const RETRIEVE_TOP_CACHE = cacheBuilder<{fromId:string|null}, Array<CardCollectionEntity>>()
  .entryLifetimeInMinutes(60)
  .build((request) => {
    return cardCollectionRetriever.retrieveVisibleTopForOwnership(request.fromId, null)
  });

const retrieveFavourites = async (request:CardCollectionRetrieveRequest):Promise<Array<CardCollectionEntity>> => {
  if (!request.includeFavourites) {
    return []
  }
  const user = userContext.getUser()
  if (!user) {
    return []
  }
  const favourites = await favouriteCollectionRetriever.retrieveByUserId(user.id)
  const collections = await cardCollectionRetriever.retrieveVisibleByIds(favourites.map(fav => fav.collectionId));
  return collections.sort(comparatorBuilder.combineAll(
    comparatorBuilder.objectAttributeDESC(val => val.priority),
    comparatorBuilder.objectAttributeASC(val => val.displayName),
  ))
}

const retrieveCollections = async (request:CardCollectionRetrieveRequest):Promise<Array<CardCollectionEntity>> => {
  if (request.parentCollectionId) {
    return cardCollectionRetriever.retrieveVisibleParentWithDescendants(request.parentCollectionId)
  }
  if (request.cardCollectionId) {
    return cardCollectionRetriever.retrieveVisibleByIds(request.cardCollectionId);
  }
  if (request.setId) {
    const collection = await cardCollectionRetriever.retrieveByIdempotencyKey(request.setId);
    return collection ? [collection] : []
  }
  if (request.searchKey) {
    return cardCollectionRetriever.retrieveVisibleParentsBySearchKey(request.searchKey, request.ownershipFilter)
  }
  if (
    request.ownershipFilter === OwnershipFilter.NEED
    || request.ownershipFilter === OwnershipFilter.OWNED
  ) {
    return cardCollectionRetriever.retrieveVisibleTopForOwnership(request.fromId, request.ownershipFilter)
  }
  return cardCollectionRetriever.retrieveVisibleTopForOwnership(request.fromId, null)
  // return RETRIEVE_TOP_CACHE.get(CACHE_ENTRY_TYPE, {fromId: request.fromId});
}

const mapCollections = async (collections:Array<CardCollectionEntity>, favourites:Array<CardCollectionEntity>) => {
  const dedupedCollections = dedupeInOrder(favourites.concat(collections), col => col.id)
  const collectionIds = dedupedCollections.map(collection => collection.id);
  const ownerships = await cardCollectionOwnershipRetriever.retrieveByCollectionIdsForCaller(collectionIds);
  return cardCollectionMapper.mapPublicList(dedupedCollections, ownerships, favourites)
}

const retrieve = async (request:CardCollectionRetrieveRequest):Promise<PublicCardCollectionDtoList> => {
  const results = await Promise.all([
    retrieveFavourites(request),
    retrieveCollections(request),
  ])
  const favourites = results[0]
  const collections = results[1]
  return mapCollections(collections, favourites);
}

export const publicCardCollectionDtoRetriever = {
  retrieve,
}