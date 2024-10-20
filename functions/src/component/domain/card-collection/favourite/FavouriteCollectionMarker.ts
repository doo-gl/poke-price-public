import {favouriteCollectionRetriever} from "./FavouriteCollectionRetriever";
import {baseFavouriteCollectionCreator, baseFavouriteCollectionDeleter} from "./FavouriteCollectionEntity";

export interface MarkFavouriteCollectionRequest {
  userId:string,
  collectionId:string,
}

const mark = async (request:MarkFavouriteCollectionRequest) => {
  const preExistingFavourite = await favouriteCollectionRetriever.retrieveByUserIdAndCollectionIds(request.userId, [request.collectionId])
  if (preExistingFavourite && preExistingFavourite.length > 0) {
    return;
  }
  await baseFavouriteCollectionCreator.create({
    userId: request.userId,
    collectionId: request.collectionId,
  })
}

const unmark = async (request:MarkFavouriteCollectionRequest) => {
  const preExistingFavourite = await favouriteCollectionRetriever.retrieveByUserIdAndCollectionIds(request.userId, [request.collectionId])
  if (!preExistingFavourite || preExistingFavourite.length === 0) {
    return;
  }
  await Promise.all(preExistingFavourite.map(fav => baseFavouriteCollectionDeleter.delete(fav._id)))
}

export const favouriteCollectionMarker = {
  mark,
  unmark,
}