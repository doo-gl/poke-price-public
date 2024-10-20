import {GenericItemImportRequest} from "./ItemImportRequest";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";
import {CreateItemRequest, itemCreator} from "../ItemCreator";
import {Images, ItemEntity} from "../ItemEntity";
import {removeNulls} from "../../../tools/ArrayNullRemover";
import {GenericItemDetails} from "../../marketplace/item-details/GenericItemDetails";
import jsConvertCase from 'js-convert-case'
import {cardImageUploader} from "../../card/CardImageUploader";
import {itemRetriever} from "../ItemRetriever";
import {ebayCardSearchParamCreator} from "../../ebay/search-param/EbayCardSearchParamCreator";
import {ebaySearchParamPriceReconciler} from "../../ebay/search-param/EbaySearchParamPriceReconciler";
import {ebayOpenListingSourcer} from "../../ebay/open-listing/EbayOpenListingSourcer";
import {cardPriceSelectionGenerator} from "../../stats/card-v2/CardPriceSelectionGenerator";
import {cardStatsGenerator} from "../../stats/card-v2/CardStatsGenerator";
import {cardSelectionReconciler} from "../../stats/card-v2/CardSelectionReconciler";
import {cardStatsCalculator} from "../../stats/card-v2/CardStatsCalculator";
import {cardPokePriceUpdater} from "../../stats/card-v2/CardPokePriceUpdater";
import {ebaySearchParamUpdater} from "../../ebay/search-param/EbayCardSearchParamUpdater";
import {TimestampStatic} from "../../../external-lib/Firebase";

const PLACEHOLDER_IMAGE:Images = {
  images: [{
    variants: [{
      url: 'INSERT_URL_HERE',
      tags: ['jpg', 'fallback'],
      format: 'jpg',
      dimensions: {height: 330, width: 240 },
    }],
  }],
}

const mapDetails = (request:GenericItemImportRequest):{[key:string]:string} => {
  const details:{[key:string]:string} = {};
  request.searchTags.forEach(searchTag => {
    const key = searchTag.key;
    const value = searchTag.value;
    if (!key) {
      return;
    }
    const keyInCamelCase = jsConvertCase.toCamelCase(key)
    details[keyInCamelCase] = value
  })
  return details;
}

const mapRequest = async (request:GenericItemImportRequest):Promise<CreateItemRequest> => {

  const itemDetails:GenericItemDetails = {
    slugExtension: null,
    searchTags: request.searchTags,
    details: mapDetails(request),
  }
  const itemCreateRequest:CreateItemRequest = {
    id: request.itemId,
    name: request.name,
    description: request.description,
    itemType: 'generic',
    itemDetails,
    identifiers: request.identifiers,
    images: PLACEHOLDER_IMAGE,
    searchKeywords: {
      includes: request.searchIncludes,
      excludes: request.searchExcludes,
      ignores: [],
    },
    nextItem: null,
    previousItem: null,
    relatedItems: {items: [], itemIds: []},
    metadata: {},
  }
  return itemCreateRequest;
}

const importItem = async (request:GenericItemImportRequest):Promise<ItemEntity> => {
  const createItemRequest = await mapRequest(request)
  const createdItem = await itemCreator.create(createItemRequest)
  await cardImageUploader.upload(createdItem._id, request.imageUrls)
  const itemId = createdItem._id.toString()

  const searchParams = await ebayCardSearchParamCreator.getOrCreateSearchParams(itemId)
  await ebaySearchParamPriceReconciler.reconcile(searchParams.id);
  await ebaySearchParamUpdater.update(searchParams.id, {backfillTime: TimestampStatic.now()})
  // await ebayOpenListingSourcer.sourceForItem(createdItem)
  // await cardPriceSelectionGenerator.generate(itemId)
  // await cardStatsGenerator.generate(itemId)
  // await cardSelectionReconciler.reconcileForCard(itemId)
  // await cardStatsCalculator.calculateForCard(itemId)
  // await cardPokePriceUpdater.update(itemId)

  return await itemRetriever.retrieveById(createdItem._id)
}

const importItems = async (requests:Array<GenericItemImportRequest>):Promise<Array<ItemEntity>> => {
  const queue = new ConcurrentPromiseQueue<ItemEntity>({maxNumberOfConcurrentPromises: 1})

  const results = await Promise.all(
    requests.map(request =>
      queue.addPromise(async () => importItem(request))
    )
  )
  return removeNulls(results)
}

export const genericItemImporter = {
  importItems,
  importItem,
}