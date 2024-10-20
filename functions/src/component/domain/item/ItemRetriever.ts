import {ObjectId} from "mongodb";
import {ItemEntity, itemRepository} from "./ItemEntity";
import {byIdRetriever} from "../../database/ByIdRetriever";
import {NotFoundError} from "../../error/NotFoundError";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {logger} from "firebase-functions";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {dedupe} from "../../tools/ArrayDeduper";
import {marketplaceListingRepository} from "../marketplace/MarketplaceListingEntity";
import {flattenArray} from "../../tools/ArrayFlattener";
import moment from "moment";
import {batchArray} from "../../tools/ArrayBatcher";
import {toSet} from "../../tools/SetBuilder";


const retrieveById = async (id:ObjectId):Promise<ItemEntity> => {
  return byIdRetriever.retrieveMongo(itemRepository, id)
}

const retrieveOptionalByIdOrLegacyId = async (id:string):Promise<ItemEntity|null> => {
  if (ObjectId.isValid(id)) {
    return await retrieveOptionalById(new ObjectId(id))
  } else {
    return await retrieveOptionalByLegacyId(id)
  }
}

const retrieveByIdOrLegacyId = async (id:string):Promise<ItemEntity> => {
  if (ObjectId.isValid(id)) {
    return await retrieveById(new ObjectId(id))
  } else {
    return await retrieveByLegacyId(id)
  }
}
const retrieveByIdOrLegacyIdOrSlug = async (idOrSlug:string):Promise<ItemEntity> => {
  const item = await retrieveOptionalByIdOrLegacyId(idOrSlug)
  if (item) {
    return item
  }
  return await retrieveBySlug(idOrSlug)
}
const retrieveOptionalByIdOrLegacyIdOrSlug = async (idOrSlug:string):Promise<ItemEntity|null> => {
  const item = await retrieveOptionalByIdOrLegacyId(idOrSlug)
  if (item) {
    return item
  }
  return await retrieveOptionalBySlug(idOrSlug)
}

const retrieveOptionalById = async (id:ObjectId):Promise<ItemEntity|null> => {
  return byIdRetriever.retrieveMongo(itemRepository, id)
}

const retrieveManyById = async (ids:Array<ObjectId>):Promise<Array<ItemEntity>> => {
  return retrieveManyByIdBatched(ids)
  // return itemRepository.getManyById(ids)
}

const retrieveManyByIdBatched = async (ids:Array<ObjectId>):Promise<Array<ItemEntity>> => {
  const batchedIds = batchArray(ids, 10)
  const results = await Promise.all(batchedIds.map(idBatch => itemRepository.getManyById(idBatch)))
  return flattenArray(results)
}

const retrieveManyByIdOrLegacyId = async (ids:Array<string>):Promise<Array<ItemEntity>> => {
  const mongoIds:Array<ObjectId> = []
  const legacyIds:Array<string> = [];
  ids.forEach(id => {
    if (ObjectId.isValid(id)) {
      mongoIds.push(new ObjectId(id))
    } else {
      legacyIds.push(id)
    }
  })
  const start = new Date()

  const getByMongoIds = async ():Promise<Array<ItemEntity>> => {
    if (mongoIds.length === 0) {
      return []
    }
    const res = await retrieveManyById(mongoIds)
    const end = new Date()
    const timeTakenMillis = end.getTime() - start.getTime()
    if (timeTakenMillis >= 1000) {
      logger.warn(`Time taken to get ${mongoIds.length} items by mongo id was ${timeTakenMillis}ms`)
    }
    return res
  }

  const getByLegacyIds = async ():Promise<Array<ItemEntity>> => {
    if (legacyIds.length === 0) {
      return []
    }
    const res = await retrieveManyByLegacyId(legacyIds)
    const end = new Date()
    const timeTakenMillis = end.getTime() - start.getTime()
    if (timeTakenMillis >= 1000) {
      logger.warn(`Time taken to get ${legacyIds.length} items by legacy id was ${timeTakenMillis}ms`)
    }
    return res
  }

  const items = flattenArray(await Promise.all([
    getByLegacyIds(),
    getByMongoIds(),
  ]))
  return dedupe(items, item => item._id.toString())
}

const retrieveManyByIdOrLegacyIdOrSlug = async (values:Array<string>):Promise<Array<ItemEntity>> => {
  const itemsById = await retrieveManyByIdOrLegacyId(values)

  const foundItemIds = toSet(itemsById, item => item._id.toString())
  itemsById.filter(item => !!item.legacyId).forEach(item => foundItemIds.add(item.legacyId ?? ""))

  const valuesWithoutAnItem = values.filter(val => !foundItemIds.has(val))
  const slugBatches = batchArray(valuesWithoutAnItem, 30)

  // ignore infinite complexity TS issue
  // @ts-ignore
  const itemBatchesBySlugPromises = slugBatches.map(slugBatch => itemRepository.getMany({slug: {$in: slugBatch}}))

  const itemBatchesBySlug = await Promise.all(itemBatchesBySlugPromises)
  const itemsBySlug = flattenArray(itemBatchesBySlug)
  return itemsById.concat(itemsBySlug)
}

const retrieveOptionalByLegacyId = async (id:string):Promise<ItemEntity|null> => {
  const items = await itemRepository.getManyByLegacyId([id])
  if (items.length === 0) {
    return null;
  }
  return items[0];
}

const retrieveByLegacyId = async (id:string):Promise<ItemEntity> => {
  const item = await retrieveOptionalByLegacyId(id)
  if (!item) {
    throw new NotFoundError(`Failed to find item with legacy id: ${id}`)
  }
  return item;
}

const retrieveManyByLegacyId = async (ids:Array<string>):Promise<Array<ItemEntity>> => {
  return itemRepository.getManyByLegacyId(ids)
}

const retrieveByNextEbayOpenListingSourcingAsc = async (limit:number):Promise<Array<ItemEntity>> => {
  return itemRepository.getMany({}, {
    limit, sort: { nextEbayOpenListingSourcingTime: 1 },
  })
}

const retrieveByNextPokePriceCalculationTimeAsc = (limit:number):Promise<Array<ItemEntity>> => {
  return itemRepository.getMany({}, {
    limit, sort: { nextPokePriceCalculationTime: 1 },
  })
}

const retrieveByNextEbayOpenListingArchiveTimeAsc = (limit:number):Promise<Array<ItemEntity>> => {
  return itemRepository.getMany({}, {
    limit, sort: {nextEbayOpenListingArchiveTime : 1 },
  })
}

const retrieveByNextHistoricalPriceArchiveTimeTimeAsc = (limit:number):Promise<Array<ItemEntity>> => {
  return itemRepository.getMany({}, {
    limit, sort: {nextHistoricalPriceArchiveTime : 1 },
  })
}

const retrieveByNextStatsCalculationTimeAsc = (limit:number):Promise<Array<ItemEntity>> => {
  return itemRepository.getMany({}, {
    limit, sort: { nextStatsCalculationTime: 1 },
  })
}

const retrieveForTags = (tags:Array<string>):Promise<Array<ItemEntity>> => {
  return itemRepository.getMany(
    {tags: {$all: tags}}
  )
}

const retrieveOneForTags = async (tags:Array<string>):Promise<ItemEntity> => {
  const items = await retrieveForTags(tags);
  if (items.length !== 1) {
    throw new InvalidArgumentError(`Failed to find 1 item for tags: ${tags.join(',')}, found: ${items.length}`)
  }
  return items[0]
}

const retrieveOptionalOneForTags = async (tags:Array<string>):Promise<ItemEntity|null> => {
  const items = await retrieveForTags(tags);
  if (items.length !== 1) {
    return null;
  }
  return items[0]
}

const retrieveBySlug = async (slug:string):Promise<ItemEntity> => {
  const items = await itemRepository.getMany({slugs: slug})
  if (items.length === 0) {
    const fallbackItems = await itemRepository.getMany({slug: slug})
    if (fallbackItems.length === 0) {
      throw new NotFoundError(`Failed to find card with slug: ${slug}`)
    }
    return fallbackItems[0];
  }
  if (items.length === 1) {
    return items[0];
  }
  logger.error(`Found ${items.length} cards for slug ${slug}, returning first`);
  return items.sort(comparatorBuilder.objectAttributeASC(card => card.dateCreated.getTime()))[0]
}

const retrieveOptionalBySlug = async (slug:string):Promise<ItemEntity|null> => {
  const items = await itemRepository.getMany({slugs: slug})
  if (items.length === 0) {
    const fallbackItems = await itemRepository.getMany({slug: slug})
    if (fallbackItems.length === 0) {
      return null;
    }
    return fallbackItems[0];
  }
  if (items.length === 1) {
    return items[0];
  }
  logger.error(`Found ${items.length} cards for slug ${slug}, returning first`);
  return items.sort(comparatorBuilder.objectAttributeASC(card => card.dateCreated.getTime()))[0]
}

const existsForTag = async (tag:string):Promise<boolean> => {
  const results = await itemRepository.getMany(
    {
      tags: tag,
    },
    {
      limit: 1,
    }
  )
  return results.length > 0;
}

export const itemRetriever = {
  existsForTag,
  retrieveById,
  retrieveByIdOrLegacyId,
  retrieveManyByIdOrLegacyId,
  retrieveManyByIdOrLegacyIdOrSlug,
  retrieveOptionalByIdOrLegacyId,
  retrieveOptionalById,
  retrieveManyByLegacyId,
  retrieveManyById,
  retrieveManyByIdBatched,
  retrieveByLegacyId,
  retrieveOptionalByLegacyId,
  retrieveByNextEbayOpenListingSourcingAsc,
  retrieveByNextPokePriceCalculationTimeAsc,
  retrieveByNextStatsCalculationTimeAsc,
  retrieveByNextEbayOpenListingArchiveTimeAsc,
  retrieveByNextHistoricalPriceArchiveTimeTimeAsc,
  retrieveForTags,
  retrieveOneForTags,
  retrieveOptionalOneForTags,
  retrieveOptionalBySlug,
  retrieveBySlug,
  retrieveByIdOrLegacyIdOrSlug,
  retrieveOptionalByIdOrLegacyIdOrSlug,
}