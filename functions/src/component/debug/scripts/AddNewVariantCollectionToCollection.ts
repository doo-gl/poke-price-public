


import {CardVariant, SearchKeywords} from "../../domain/card/CardEntity";
import {ItemEntity, itemUpdater, legacyIdOrFallback} from "../../domain/item/ItemEntity";
import {Create} from "../../database/mongo/MongoEntity";
import {cardCollectionRetriever} from "../../domain/card-collection/CardCollectionRetriever";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {
  toReverseHoloIdempotencyKey,
  toStandardIdempotencyKey,
} from "../../domain/card-collection/SetToCardCollectionCreator";
import {itemRetriever} from "../../domain/item/ItemRetriever";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";
import {variantCardCloner} from "../../domain/card/VariantCardCLoner";
import {ebayCardSearchParamCreator} from "../../domain/ebay/search-param/EbayCardSearchParamCreator";
import {ebaySearchParamUpdater} from "../../domain/ebay/search-param/EbayCardSearchParamUpdater";
import {TimestampStatic} from "../../external-lib/Firebase";
import {cardCollectionCreator} from "../../domain/card-collection/CardCollectionCreator";
import {Zero} from "../../domain/money/CurrencyAmount";
import {CurrencyCode} from "../../domain/money/CurrencyCodes";
import {collectionStatsUpdater} from "../../domain/card-collection/CollectionStatsUpdater";
import {convertToKey} from "../../tools/KeyConverter";
import {root} from "cheerio";
import {CardCollectionEntity} from "../../domain/card-collection/CardCollectionEntity";
import {toInputValueSet} from "../../tools/SetBuilder";

export interface AddVariantCollectionRequest {
  collectionId:string,
  newVariant:CardVariant,
  filter:(itemToClone:ItemEntity) => boolean,
  includeMapper:(includes:Array<string>) => Array<string>,
  excludeMapper:(excludes:Array<string>) => Array<string>,
}

const add = async (request:AddVariantCollectionRequest):Promise<CardCollectionEntity> => {
  const {
    collectionId,
    newVariant,
    filter,
    includeMapper,
    excludeMapper,
  } = request;

  const rootCollection = await cardCollectionRetriever.retrieve(collectionId)
  if (rootCollection.parentCollectionId) {
    throw new InvalidArgumentError(`Collection with id: ${collectionId}, is not a root collection`)
  }

  const childCollections = await cardCollectionRetriever.retrieveDescendants(collectionId)
  const standardIdempotencyKey = toStandardIdempotencyKey(rootCollection.idempotencyKey)
  const standardCollection = childCollections.find(
    col => col.idempotencyKey === standardIdempotencyKey
  )
  if (!standardCollection) {
    throw new InvalidArgumentError(`Collection with id: ${collectionId} does not have child with idempotency key: ${standardIdempotencyKey}`)
  }

  const standardItems = await itemRetriever.retrieveManyByIdOrLegacyId(
    standardCollection.cardIds
  )

  const newClonedItems = new Array<ItemEntity>()

  const queue = new ConcurrentPromiseQueue({maxNumberOfConcurrentPromises: 5})
  await Promise.all(standardItems.map(item => queue.addPromise(async () => {
    const shouldNotClone = filter(item)
    if (shouldNotClone) {
      return
    }

    const clonedItemResponse = await variantCardCloner.clone(item._id, newVariant)
    const clonedItem = clonedItemResponse.card
    newClonedItems.push(clonedItem)
    const includes = includeMapper(clonedItem.searchKeywords.includes)
    const excludes = excludeMapper(clonedItem.searchKeywords.excludes)
    const newSearchParams = await ebayCardSearchParamCreator.create({
      cardId: legacyIdOrFallback(clonedItem),
      includeKeywords: includes,
      excludeKeywords: excludes,
    })
    const newSearchKeywords:SearchKeywords = {
      ...clonedItem.searchKeywords,
      includes,
      excludes,
    }
    await itemUpdater.updateOnly(clonedItem._id, {searchKeywords: newSearchKeywords})
    await ebaySearchParamUpdater.update(newSearchParams.id, {backfillTime: TimestampStatic.now()})
  })))

  const newClonedCollection = await cardCollectionCreator.create({
    visible: false,
    name: `${rootCollection.name}-${convertToKey(newVariant)}`,
    displayName: rootCollection.displayName,
    parentCollectionId: rootCollection.id,
    backgroundImageUrl: rootCollection.backgroundImageUrl,
    imageUrl: rootCollection.imageUrl,
    logoUrl: rootCollection.logoUrl,
    idempotencyKey: `${rootCollection.idempotencyKey}|${newVariant}`,
    region: rootCollection.region,
    priority: rootCollection.priority,
    cardIds: newClonedItems.map(card => legacyIdOrFallback(card)),
    visibleCardIds: [],
    stats: {
      count: 0,
      totalPrice: Zero(CurrencyCode.GBP).toCurrencyAmountLike(),
      visibleCount: 0,
      visibleTotalPrice: Zero(CurrencyCode.GBP).toCurrencyAmountLike(),
      lastUpdatedAt: TimestampStatic.now(),
    },
    statsV2: {
      count: 0,
      visibleCount: 0,
      lastUpdatedAt: TimestampStatic.now(),
      prices: [],
    },
  });


  await collectionStatsUpdater.update(rootCollection.id)
  return newClonedCollection
}

export const addNewVariantCollectionToCollection = {
  add,
}