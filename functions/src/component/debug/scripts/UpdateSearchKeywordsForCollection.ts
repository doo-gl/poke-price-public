import {cardCollectionRetriever} from "../../domain/card-collection/CardCollectionRetriever";
import {itemRetriever} from "../../domain/item/ItemRetriever";
import {itemRepository} from "../../domain/item/ItemEntity";
import {ebayCardSearchParamCreator} from "../../domain/ebay/search-param/EbayCardSearchParamCreator";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";
import {ebaySearchParamUpdater} from "../../domain/ebay/search-param/EbayCardSearchParamUpdater";
import {TimestampStatic} from "../../external-lib/Firebase";


const update = async (
  collectionId:string,
  includeMapper:(includes:Array<string>) => Array<string>,
  excludeMapper:(excludes:Array<string>) => Array<string>,
) => {

  const collection = await cardCollectionRetriever.retrieve(collectionId)
  const items = await itemRetriever.retrieveManyByIdOrLegacyId(collection.cardIds)
  const queue = new ConcurrentPromiseQueue({maxNumberOfConcurrentPromises: 5})

  await Promise.all(items.map(async item => queue.addPromise(async () => {
    const searchKeywords = item.searchKeywords
    searchKeywords.includes = includeMapper(searchKeywords.includes)
    searchKeywords.excludes = excludeMapper(searchKeywords.excludes)
    await itemRepository.updateOnly(item._id, {searchKeywords})
    const newEbayParams = await ebayCardSearchParamCreator.createFromItemKeywords(item._id.toString())
    await ebaySearchParamUpdater.update(newEbayParams.id, {backfillTime: TimestampStatic.now()})
  })))

}

export const updateSearchKeywordsForCollection = {
  update,
}