import {CardVariant} from "./CardEntity";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {logger} from "firebase-functions";
import moment from "moment/moment";
import {EbayCardSearchParamEntity} from "../ebay/search-param/EbayCardSearchParamEntity";
import {ebayCardSearchParamCreator} from "../ebay/search-param/EbayCardSearchParamCreator";
import {
  baseItemCreator,
  ItemEntity,
  languageOrFallback,
  legacyIdOrFallback,
  SingleCardItemDetails,
} from "../item/ItemEntity";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../marketplace/item-details/SinglePokemonCardItemDetails";
import {Create} from "../../database/mongo/MongoEntity";
import {ObjectId} from "mongodb";
import {itemRetriever} from "../item/ItemRetriever";
import {itemTagExtractor} from "../item/tag/ItemTagExtractor";
import {toTag} from "../search-tag/SearchTagEntity";
import {lodash} from "../../external-lib/Lodash";
import {searchKeywordGenerator} from "../item/search-keyword/SearchKeywordGenerator";
import {toCard} from "../item/CardItem";
import {itemUpserter} from "../item/ItemUpserter";

export interface VariantCloneResponse {
  card:ItemEntity,
  searchParams:EbayCardSearchParamEntity,
}

const calculateCreate = (item:ItemEntity, variant:CardVariant) => {

  const itemId = item._id.toString()
  const cardDetails = toCard(item)

  if (!cardDetails) {
    throw new InvalidArgumentError(`Item with id: ${itemId} is not of type: ${SINGLE_POKEMON_CARD_ITEM_TYPE}, actual: ${item.itemType}`)
  }

  if (cardDetails.variant !== CardVariant.DEFAULT) {
    throw new InvalidArgumentError(`Card with id: ${itemId} is not the ${CardVariant.DEFAULT} variant`);
  }

  if (!cardDetails.pokemon) {
    logger.warn(`Card: ${itemId} does not have pokemon`)
  }

  if (!cardDetails.energyTypes) {
    logger.warn(`Card: ${itemId} does not have energy types`)
  }

  if (!cardDetails.subTypes) {
    logger.warn(`Card: ${itemId} does not have sub types`)
  }

  const newItemDetails:SingleCardItemDetails = lodash.cloneDeep(cardDetails)
  newItemDetails.variant = variant;
  const mongoCreate:Create<ItemEntity> = {
    slug: null,
    slugs: [],
    slugSuffixId: null,
    visible: false,
    name: item.name,
    displayName: item.displayName,
    description: item.description,
    searchKeywords: item.searchKeywords,
    identifiers: {},
    itemType: SINGLE_POKEMON_CARD_ITEM_TYPE,
    itemDetails: newItemDetails,
    nextPokePriceCalculationTime: moment().toDate(),
    nextStatsCalculationTime: moment().toDate(),
    nextEbayOpenListingSourcingTime: moment().toDate(),
    images: item.images,
    itemPrices: {prices: []},
    pokePrices: [],
    sort: {name: item.name, ukPrice: null, ukSales: null, usPrice: null, usSales: null},
    tags: [],
    searchTags: [],
    nextItem: null,
    previousItem: null,
    relatedItems: {itemIds: [], items:[]},
    metadata: {
      externalIdentifiers: item.metadata?.externalIdentifiers,
    },
  }
  const searchKeywords = searchKeywordGenerator.generate(mongoCreate)
  mongoCreate.searchKeywords = searchKeywords
  const searchTags = itemTagExtractor.extract(mongoCreate);
  const tags = searchTags.map(toTag);
  mongoCreate.searchTags = searchTags;
  mongoCreate.tags = tags;

  return mongoCreate
}

const getOrCreateVariantCard = async (cardId:ObjectId, variant:CardVariant):Promise<ItemEntity> => {
  const item = await itemRetriever.retrieveById(cardId);
  const mongoCreate = calculateCreate(item, variant)
  const itemDetails = mongoCreate.itemDetails

  const preExistingCard = await cardItemRetriever.retrieveOptionalByUniqueCard({
    series: itemDetails.series,
    set: itemDetails.set,
    numberInSet: itemDetails.cardNumber,
    variant,
    language: languageOrFallback(itemDetails.language),
  });

  return itemUpserter.upsert(mongoCreate, preExistingCard)
}

const clone = async (cardId:ObjectId, variant:CardVariant):Promise<VariantCloneResponse> => {
  logger.info(`Cloning card with id: ${cardId.toString()} with variant: ${variant}`)
  const variantCard = await getOrCreateVariantCard(cardId, variant);
  const variantSearchParams = await ebayCardSearchParamCreator.getOrCreateSearchParams(legacyIdOrFallback(variantCard))

  return {
    card: variantCard,
    searchParams: variantSearchParams,
  }
}

export const variantCardCloner = {
  clone,
}