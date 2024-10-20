import {setInfoSourcer} from "../../domain/pokemon-tcg-api-v2/SetInfoSourcer";
import {setRetriever} from "../../domain/set/SetRetriever";
import {setToCardCollectionCreator} from "../../domain/card-collection/SetToCardCollectionCreator";
import {cardItemRetriever} from "../../domain/item/CardItemRetriever";
import {itemRepository} from "../../domain/item/ItemEntity";
import {ebayCardSearchParamCreator} from "../../domain/ebay/search-param/EbayCardSearchParamCreator";
import {ebaySearchParamRetriever} from "../../domain/ebay/search-param/EbayCardSearchParamRetriever";
import {EbayCardSearchParamEntity} from "../../domain/ebay/search-param/EbayCardSearchParamEntity";
import {TimestampStatic} from "../../external-lib/Firebase";
import {ebayCardSearchParamRepository} from "../../domain/ebay/search-param/EbayCardSearchParamRepository";
import {cardCollectionRetriever} from "../../domain/card-collection/CardCollectionRetriever";
import {collectionVisibilityUpdater} from "../../domain/card-collection/CollectionVisibilityUpdater";
import {BatchUpdate as BatchFirebaseUpdate} from '../../database/BaseCrudRepository'
import {UnexpectedError} from "../../error/UnexpectedError";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";
import moment from "moment";
import {logger} from "firebase-functions";

export interface Options {
  withReverseHolos?:boolean,
  makeVisible?:boolean,
  scheduleBackfill?:boolean,
  schedulePriceCalc?:boolean,
  includeMapping?:{from:string, to:string}
}

const add = async (tcgApiId:string, options:Options) => {

  const queue = new ConcurrentPromiseQueue({maxNumberOfConcurrentPromises: 5})

  let set1 = await setRetriever.retrieveSetByPokemonTcgApiId(tcgApiId)


  if (!set1) {
    await setInfoSourcer.sourceSetWithExtras(tcgApiId, options.withReverseHolos ?? false)
    set1 = await setRetriever.retrieveSetByPokemonTcgApiId(tcgApiId)
  }

  if (!set1) {
    throw new UnexpectedError(`Failed to find set for ${tcgApiId}`)
  }

  await setToCardCollectionCreator.create(set1.id)

  const items1 = await cardItemRetriever.retrieveBySetId(set1.id)

  if (items1.length === 0) {
    throw new UnexpectedError(`Failed to find items for set id: ${set1.id}`)
  }
  logger.info(`Found ${items1.length} items for set: ${set1.id}`)

  // when the set has non number card No, use this to update the search params

  if (options.includeMapping) {
    const mapping = options.includeMapping
    await Promise.all(items1.map(async item => queue.addPromise(async () => {
      const newIncludes = item.searchKeywords.includes.filter(inc => inc !== mapping.from)
      newIncludes.push(mapping.to)
      const searchKeywords = item.searchKeywords
      searchKeywords.includes = newIncludes
      await itemRepository.updateOnly(item._id, {searchKeywords})
      await ebayCardSearchParamCreator.createFromItemKeywords(item._id.toString())
    })))
  }


  if (options.schedulePriceCalc) {
    await Promise.all(items1.map(async item => queue.addPromise(async () => {
      await itemRepository.updateOnly(item._id, {
        nextEbayOpenListingSourcingTime: new Date(0),
        nextStatsCalculationTime: moment().add(2, "hour").toDate(),
        nextPokePriceCalculationTime: moment().add(4, "hour").toDate(),
      })
    })))
  }

  if (options.scheduleBackfill) {
    const params = await ebaySearchParamRetriever.retrieveSearchParamsForCardIds(items1.map(itm => itm._id.toString()))
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


  if (options.makeVisible) {
    const collection1 = await cardCollectionRetriever.retrieveByIdempotencyKey(set1.id)

    if (!collection1) {
      throw new UnexpectedError(`Failed to find collection for idempotency key: ${set1.id}`)
    }

    await collectionVisibilityUpdater.makeVisibleWithCards(collection1.id)
  }

}

export const addNewSetFromApi = {
  add,
}
