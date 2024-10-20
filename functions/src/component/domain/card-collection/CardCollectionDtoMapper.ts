import {CardCollectionEntity} from "./CardCollectionEntity";
import {CardCollectionOwnershipEntity} from "./CardCollectionOwnershipEntity";
import {CardCollectionOwnershipDto, PublicCardCollectionDto, PublicCardCollectionDtoList} from "./CardCollectionDto";
import {toInputValueMap} from "../../tools/MapBuilder";
import {toSet} from "../../tools/SetBuilder";


const mapOwnership = (ownership:CardCollectionOwnershipEntity|null):CardCollectionOwnershipDto|null => {
  if (!ownership) {
    return null;
  }
  return {
    cardCollectionId: ownership.cardCollectionId,
    ownedCardIds: ownership.ownedCardIds,
    userId: ownership.userId,
  }
}

const mapPublic = (collection:CardCollectionEntity, ownership:CardCollectionOwnershipEntity|null, isFavourite:boolean):PublicCardCollectionDto => {
  return {
    name: collection.name,
    displayName: collection.displayName,
    cardIds: collection.visibleCardIds,
    imageUrl: collection.imageUrl,
    backgroundImageUrl: collection.backgroundImageUrl,
    logoUrl: collection.logoUrl,
    collectionId: collection.id,
    parentCollectionId: collection.parentCollectionId,
    region: collection.region,
    ownership: mapOwnership(ownership),
    stats: {
      count: collection.stats.visibleCount,
      totalPrice: collection.stats.visibleTotalPrice,
    },
    statsV2: {
      count: collection.statsV2.visibleCount,
      prices: collection.statsV2.prices.map(priceStat => ({
        totalPrice: priceStat.visibleTotalPrice,
        currencyCode: priceStat.currencyCode,
      })),
    },
    isFavourite,
  }
}

const mapPublicList = (collections:Array<CardCollectionEntity>, ownerships:Array<CardCollectionOwnershipEntity>, favourites:Array<CardCollectionEntity>):PublicCardCollectionDtoList => {
  const collectionIdToOwnership = toInputValueMap(ownerships, ownership => ownership.cardCollectionId);
  const favouriteCollectionIdSet = toSet(favourites, input => input.id)
  const results = collections
    .map(collection => {
      const ownership = collectionIdToOwnership.get(collection.id) || null;
      return mapPublic(collection, ownership, favouriteCollectionIdSet.has(collection.id));
    })
  return {
    results,
  }
}

export const cardCollectionMapper = {
  mapPublic,
  mapPublicList,
}