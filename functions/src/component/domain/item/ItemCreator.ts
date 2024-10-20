import {Create, Update} from "../../database/mongo/MongoEntity";
import {
  baseItemCreator,
  Identifiers,
  Images,
  ItemEntity,
  ItemTypeV2, itemUpdater,
  RelatedItem,
  RelatedItems,
  SingleCardItemDetails,
} from "./ItemEntity";
import moment from "moment";
import {convertToKey} from "../../tools/KeyConverter";
import {SearchKeywords} from "../card/CardEntity";
import {uuid} from "../../external-lib/Uuid";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../marketplace/item-details/SinglePokemonCardItemDetails";
import {cardSlugGenerator} from "../card/seo/CardSlugGenerator";
import {GENERIC_ITEM_TYPE, GenericItemDetails} from "../marketplace/item-details/GenericItemDetails";
import {itemTagExtractor} from "./tag/ItemTagExtractor";
import {toTag} from "../search-tag/SearchTagEntity";
import {dedupe} from "../../tools/ArrayDeduper";
import {itemRetriever} from "./ItemRetriever";
import {ObjectId} from "mongodb";
import {lodash} from "../../external-lib/Lodash";
import {ebayCardSearchParamCreator} from "../ebay/search-param/EbayCardSearchParamCreator";
import {searchKeywordGenerator} from "./search-keyword/SearchKeywordGenerator";

export interface CreateItemRequest {
  id:string|null,
  name:string,
  description:string|null,
  searchKeywords:SearchKeywords,
  identifiers:Identifiers,
  itemType:ItemTypeV2,
  itemDetails:any,
  images:Images,
  nextItem:RelatedItem|null,
  previousItem:RelatedItem|null,
  relatedItems:RelatedItems,
  metadata:any,
}

const generateSlug = (request:CreateItemRequest, slugSuffixId:string):string => {
  if (request.itemType === SINGLE_POKEMON_CARD_ITEM_TYPE) {
    const cardDetails = <SingleCardItemDetails>request.itemDetails;
    return cardSlugGenerator.generate({
      id: `${slugSuffixId}-`,
      name: request.name,
      set: cardDetails.set,
      numberInSet: cardDetails.cardNumber,
      displaySetNumber: cardDetails.setNumber,
      variant: cardDetails.variant,
    })
  }
  if (request.itemType === GENERIC_ITEM_TYPE) {
    const genericDetails = <GenericItemDetails>request.itemDetails;
    const slugExtension = genericDetails.slugExtension;
    return `${convertToKey(request.name)}${slugExtension ? `-${slugExtension}`: ''}-${slugSuffixId}`
  }
  return `${convertToKey(request.name)}-${slugSuffixId}`
}

const extractIdentifiers = (identifiers:Identifiers):Array<string> => {
  const ids:Array<string> = []
  Object.values(identifiers).map(value => {
    if (typeof value === "string") {
      ids.push(value)
    }
    if (Array.isArray(value)) {
      value.forEach(val => {
        if (typeof val === "string") {
          ids.push(val)
        }
      })
    }
  })
  return dedupe(ids, v => v)
}

const updateItem = async (item:ItemEntity, request:CreateItemRequest):Promise<ItemEntity> => {
  const update:Update<ItemEntity> = {}

  const slugId = uuid()
  const slugSuffixId = slugId.slice(0, slugId.indexOf('-'))
  const newSlug = generateSlug(request, item.slugSuffixId ?? slugSuffixId)
  const oldSlug = item.slug
  if (!oldSlug || lodash.isNotEqual(oldSlug, newSlug)) {
    update.slug = newSlug
    const newSlugs = item.slugs ? item.slugs.slice() : []
    newSlugs.push(newSlug)
    update.slugs = newSlugs
  }

  const newNameKey = convertToKey(request.name)
  const oldNameKey = item.name
  if (lodash.isNotEqual(oldNameKey, newNameKey)) {
    update.name = newNameKey
  }

  const newName = request.name
  const oldName = item.displayName
  if (lodash.isNotEqual(oldName, newName)) {
    update.displayName = newName
  }

  const newDescription = request.description
  const oldDescription = item.description
  if (lodash.isNotEqual(oldDescription, newDescription)) {
    update.description = newDescription
  }

  const newSearchKeywords = request.searchKeywords
  const oldSearchKeywords = item.searchKeywords
  if (lodash.isNotEqual(oldSearchKeywords, newSearchKeywords)) {
    update.searchKeywords = newSearchKeywords
  }

  const newIdentifiers = request.identifiers
  const oldIdentifiers = item.identifiers
  if (lodash.isNotEqual(oldIdentifiers, newIdentifiers)) {
    update.identifiers = newIdentifiers
    const allIdentifiers = extractIdentifiers(request.identifiers)
    update.allIdentifiers = allIdentifiers
  }

  const newItemType = request.itemType
  const oldItemType = item.itemType
  if (lodash.isNotEqual(oldItemType, newItemType)) {
    update.itemType = newItemType
  }

  const newItemDetails = request.itemDetails
  const oldItemDetails = item.itemDetails
  if (lodash.isNotEqual(oldItemDetails, newItemDetails)) {
    update.itemDetails = newItemDetails
  }


  if (Object.values(update).length === 0) {
    return item
  }
  const updatedItem = await itemUpdater.updateAndReturn(item._id, update)

  if (update.searchKeywords) {
    await ebayCardSearchParamCreator.create({
      cardId: item._id.toString(),
      includeKeywords: update.searchKeywords.includes,
      excludeKeywords: update.searchKeywords.excludes,
    })
  }

  const newSearchTags = itemTagExtractor.extract(updatedItem)
  const oldSearchTags = item.searchTags
  if (lodash.isNotEqual(oldSearchTags, newSearchTags)) {
    const tags = newSearchTags.map(toTag);
    return itemUpdater.updateAndReturn(item._id, {tags, searchTags: newSearchTags})
  }
  return updatedItem
}

const create = async (request:CreateItemRequest):Promise<ItemEntity> => {

  if (request.id) {
    const preExistingItem = await itemRetriever.retrieveById(new ObjectId(request.id))
    return updateItem(preExistingItem, request)
  }

  const slugId = uuid()
  const slugSuffixId = slugId.slice(0, slugId.indexOf('-'))
  const nameKey = convertToKey(request.name)
  const slug = generateSlug(request, slugSuffixId);
  const allIdentifiers = extractIdentifiers(request.identifiers)

  const createEntity:Create<ItemEntity> = {
    slug,
    slugs: [slug],
    slugSuffixId,
    visible: false,
    name: nameKey,
    displayName: request.name,
    description: request.description,
    searchKeywords: request.searchKeywords,
    identifiers: request.identifiers,
    allIdentifiers,
    itemType: request.itemType,
    itemDetails: request.itemDetails,
    nextPokePriceCalculationTime: moment().add(1, 'day').toDate(),
    nextStatsCalculationTime: moment().add(1, 'day').toDate(),
    nextEbayOpenListingSourcingTime: moment().add(1, 'day').toDate(),
    images: request.images,
    itemPrices: {prices: []},
    pokePrices: [],
    sort: {name: nameKey, ukPrice: null, ukSales: null, usPrice: null, usSales: null},
    tags: [],
    searchTags: [],
    nextItem: request.nextItem,
    previousItem: request.previousItem,
    relatedItems: request.relatedItems,
    metadata: request.metadata,
  }
  const searchKeywords = searchKeywordGenerator.generate(createEntity)
  createEntity.searchKeywords = searchKeywords
  const searchTags = itemTagExtractor.extract(createEntity);
  const tags = searchTags.map(toTag);
  createEntity.searchTags = searchTags;
  createEntity.tags = tags;
  const item = await baseItemCreator.create(createEntity)
  return item;
}

export const itemCreator = {
  create,
}