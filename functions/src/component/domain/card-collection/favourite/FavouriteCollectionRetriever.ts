import {FavouriteCollectionEntity, favouriteCollectionRepository} from "./FavouriteCollectionEntity";


const retrieveByUserIdAndCollectionIds = (userId:string, collectionIds:Array<string>):Promise<Array<FavouriteCollectionEntity>> => {
  return favouriteCollectionRepository.getMany({
    userId,
    collectionId: {$in: collectionIds},
  })
}

const retrieveByUserId = (userId:string):Promise<Array<FavouriteCollectionEntity>> => {
  return favouriteCollectionRepository.getMany({
    userId,
  })
}

export const favouriteCollectionRetriever = {
  retrieveByUserIdAndCollectionIds,
  retrieveByUserId,
}