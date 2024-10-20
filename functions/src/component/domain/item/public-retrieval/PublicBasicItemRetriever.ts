import {PublicBasicItemResponseV2, PublicItemRequestV2} from "./PublicItemRetrieverV2";
import {PagingResults} from "../../PagingResults";
import {itemRepository} from "../ItemEntity";
import {requestToDatabaseQueryMapper} from "./RequestToDatabaseQueryMapper";
import {fromTag} from "../../search-tag/SearchTagEntity";
import {itemMapperV2} from "./ItemMapperV2";
import {BasicItemDto} from "./ItemDtoV2";
import {ObjectId} from "mongodb";
import {logger} from "firebase-functions";
import {flattenArray} from "../../../tools/ArrayFlattener";
import {dedupe} from "../../../tools/ArrayDeduper";
import {batchArray} from "../../../tools/ArrayBatcher";
import {itemIdOrSlugRetriever} from "../ItemIdOrSlugRetriever";

const BASIC_ITEM_PROJECTION = {
  _id:1,
  legacyId:1,
  slug:1,
  name:1,
  displayName:1,
  images:1,
  itemType:1,
  itemDetails:1,
  pokePrices:1,
  visible:1,
}

const mapBasicItem = (item:any):BasicItemDto => {
  return {
    itemId: item._id,
    legacyItemId: item.legacyId,
    slug: item.slug,
    name: item.name,
    displayName: item.displayName,
    images: item.images,
    itemType: item.itemType,
    itemDetails: itemMapperV2.mapItemDetails(item.itemType, item.itemDetails),
    pokePrices: item.pokePrices,
    rating: null,
  }
}

const retrieveItemsFromDatabase = async (request:PublicItemRequestV2):Promise<PagingResults<BasicItemDto>> => {

  const query = requestToDatabaseQueryMapper.map(request)

  const findOptions = query.findOptions
  findOptions.projection = BASIC_ITEM_PROJECTION

  const items:Array<any> = await itemRepository.getMany(query.filter, findOptions)
  const results:Array<BasicItemDto> = items
    .filter(item => !!item.visible)
    .map(item => mapBasicItem(item))
  return {
    results,
    paging: {
      pageIndex: query.pageIndex,
      pageSize: query.limit,
      count: 0,
    },
  }
}

const retrieve = async (request:PublicItemRequestV2):Promise<PublicBasicItemResponseV2> => {
  const items = await retrieveItemsFromDatabase(request)
  return {
    request: {
      ...request,
      tags: request.tags?.map(tag => fromTag(tag)),
    },
    paging: items.paging,
    results: items.results,
  }
}

const retrieveManyByIdBatched = async (ids:Array<ObjectId>):Promise<Array<any>> => {
  const batchedIds = batchArray(ids, 10)
  const results = await Promise.all(batchedIds.map(idBatch => itemRepository.getMany(
    { _id: { $in: idBatch } },
    { projection: BASIC_ITEM_PROJECTION }
  )))
  return flattenArray(results)
}

const retrieveManyByLegacyIdBatched = async (ids:Array<string>):Promise<Array<any>> => {
  const batchedIds = batchArray(ids, 10)
  const results = await Promise.all(batchedIds.map(idBatch => itemRepository.getMany(
    { legacyId: { $in: idBatch } },
    { projection: BASIC_ITEM_PROJECTION }
  )))
  return flattenArray(results)
}

const retrieveManyBySlugBatched = async (slugs:Array<string>):Promise<Array<any>> => {
  const batchedSlugs = batchArray(slugs, 10)
  const results = await Promise.all(batchedSlugs.map(slugBatch => itemRepository.getMany(
    { slug: { $in: slugBatch } },
    { projection: BASIC_ITEM_PROJECTION }
  )))
  return flattenArray(results)
}

const retrieveByIds = async (itemIds:Array<string>):Promise<Array<BasicItemDto>> => {
  const mongoIds:Array<ObjectId> = []
  const legacyIds:Array<string> = []
  const slugs:Array<string> = []

  itemIds.forEach(id => {
    if (ObjectId.isValid(id)) {
      mongoIds.push(new ObjectId(id))
    } else {
      if (itemIdOrSlugRetriever.isId(id)) {
        legacyIds.push(id)
      } else {
        slugs.push(id)
      }
    }
  })

  const start = new Date()

  const getByMongoIds = async ():Promise<Array<any>> => {
    if (mongoIds.length === 0) {
      return []
    }
    const res = await retrieveManyByIdBatched(mongoIds)
    const end = new Date()
    const timeTakenMillis = end.getTime() - start.getTime()
    if (timeTakenMillis >= 1000) {
      logger.warn(`Time taken to get ${mongoIds.length} basic items by mongo id was ${timeTakenMillis}ms`)
    }
    return res
  }

  const getByLegacyIds = async ():Promise<Array<any>> => {
    if (legacyIds.length === 0) {
      return []
    }
    const res = await retrieveManyByLegacyIdBatched(legacyIds)
    const end = new Date()
    const timeTakenMillis = end.getTime() - start.getTime()
    if (timeTakenMillis >= 1000) {
      logger.warn(`Time taken to get ${legacyIds.length} basic items by legacy id was ${timeTakenMillis}ms`)
    }
    return res
  }

  const getBySlugs = async ():Promise<Array<any>> => {
    if (slugs.length === 0) {
      return []
    }
    const res = await retrieveManyBySlugBatched(slugs)
    const end = new Date()
    const timeTakenMillis = end.getTime() - start.getTime()
    if (timeTakenMillis >= 1000) {
      logger.warn(`Time taken to get ${slugs.length} basic items by slug was ${timeTakenMillis}ms`)
    }
    return res
  }

  const items = flattenArray(await Promise.all([
    getByLegacyIds(),
    getByMongoIds(),
    getBySlugs(),
  ]))
  return dedupe(items, item => item._id.toString())
    .map(item => mapBasicItem(item))
}

export const publicBasicItemRetriever = {
  retrieve,
  retrieveByIds,
}