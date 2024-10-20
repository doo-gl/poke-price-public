import {favouriteCollectionRetriever} from "./FavouriteCollectionRetriever";


export interface PublicFavouriteCollection {
  userId:string,
  collectionId:string,
}

export interface PublicFavouriteCollectionList {
  results:Array<PublicFavouriteCollection>
}

export interface PublicFavouriteCollectionRequest {
  userId:string
}

const retrieve = async (request:PublicFavouriteCollectionRequest):Promise<PublicFavouriteCollectionList> => {
  const favourites = await favouriteCollectionRetriever.retrieveByUserId(request.userId)
  return {
    results: favourites.map(fav => ({
      userId: fav.userId,
      collectionId: fav.collectionId,
    })),
  }
}

export const publicFavouriteCollectionRetriever = {
  retrieve,
}