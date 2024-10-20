import {cardCollectionRetriever} from "../../domain/card-collection/CardCollectionRetriever";
import {ebaySearchParamRetriever} from "../../domain/ebay/search-param/EbayCardSearchParamRetriever";
import {BatchUpdate as BatchFirebaseUpdate} from "../../database/BaseCrudRepository";
import {EbayCardSearchParamEntity} from "../../domain/ebay/search-param/EbayCardSearchParamEntity";
import {TimestampStatic} from "../../external-lib/Firebase";
import {ebayCardSearchParamRepository} from "../../domain/ebay/search-param/EbayCardSearchParamRepository";


const backfill = async (collectionId:string) => {

  const collection = await cardCollectionRetriever.retrieve(collectionId)
  const itemIds = collection.cardIds

  const params = await ebaySearchParamRetriever.retrieveSearchParamsForCardIds(itemIds)
  const paramUpdates:Array<BatchFirebaseUpdate<EbayCardSearchParamEntity>> = []
  params.forEach(param => {
    paramUpdates.push({
      id: param.id,
      update: {
        backfillTime: TimestampStatic.now(),
      },
    })
  })
  await ebayCardSearchParamRepository.batchUpdate(paramUpdates)

}

export const backfillAllItemsInCollection = {
  backfill,
}