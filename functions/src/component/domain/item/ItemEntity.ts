import {CardVariant, SearchKeywords} from "../card/CardEntity";
import {CurrencyAmountLike} from "../money/CurrencyAmount";
import {JSONSchemaType} from "ajv";
import {MongoEntity} from "../../database/mongo/MongoEntity";
import {SearchTag} from "../search-tag/SearchTagEntity";
import {CurrencyCode} from "../money/CurrencyCodes";
import {mongoRepositoryFactory} from "../../database/mongo/MongoRepositoryFactory";
import {EntityUpdater} from "../../database/mongo/MongoEntityUpdaterFactory";
import {byIdRetriever} from "../../database/ByIdRetriever";
import {onItemUpdateHandler} from "./OnItemUpdateHandler";
import {SinglePokemonCardItemType} from "../marketplace/item-details/SinglePokemonCardItemDetails";
import {GenericItemType} from "../marketplace/item-details/GenericItemDetails";
import {EntityCreator} from "../../database/mongo/MongoEntityCreatorFactory";
import {onItemCreateHandler} from "./OnItemCreateHandler";
import {pokemonNameExtractor} from "../pokemon-tcg-api-v2/PokemonNameExtractor";

export interface ImageVariant {
  size?:number,
  format?:string,
  dimensions?:{height:number, width:number}|null
  url:string,
  tags:Array<string>
}
export const imageVariantSchema:JSONSchemaType<ImageVariant> = {
  type: "object",
  properties: {
    size: {type: "integer", nullable: true},
    format: {type: "string", nullable: true},
    dimensions: {
      type: "object",
      properties: {
        height: { type: "integer" },
        width: { type: "integer" },
      },
      additionalProperties: false,
      nullable: true,
      required: ['height', 'width'],
    },
    url: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
  required: ["url", "tags"],
}

export interface Image {
  variants:Array<ImageVariant>
}
export const imageSchema:JSONSchemaType<Image> = {
  type: "object",
  properties: {
    variants: { type: "array", items: imageVariantSchema },
  },
  additionalProperties: false,
  required: ["variants"],
}

export interface Images {
  images:Array<Image>
}
export const imagesSchema:JSONSchemaType<Images> = {
  type: "object",
  properties: {
    images: { type: "array", items: imageSchema },
  },
  additionalProperties: false,
  required: ["images"],
}

export interface RelatedItem {
  id:string,
  slug:string,
  name:string,
  longName:string,
  image:Images
}

export interface RelatedItems {
  itemIds:Array<string>,
  items:Array<RelatedItem>
}

export enum ItemType {
  SINGLE_CARD = 'SINGLE_CARD'
}

export enum PriceSource {
  EBAY = 'EBAY',
  TCG_PLAYER = 'TCG_PLAYER',
  CARDMARKET = 'CARDMARKET',
  USER_MANUALLY_SET = 'USER_MANUALLY_SET',
}

export interface PokePrice {
  currencyCode:CurrencyCode,
  currenciesUsed:Array<CurrencyCode>|null,
  lastUpdatedAt:Date|null,
  lowPrice:CurrencyAmountLike|null,
  price:CurrencyAmountLike|null,
  highPrice:CurrencyAmountLike|null,
  priceSource:PriceSource|null,
}

export interface PokePriceOverride {
  currencyCode:CurrencyCode,
  priceSource:PriceSource|null,
}

export enum PriceType {
  LISTING = 'LISTING',
  SALE = 'SALE'
}

export interface ItemPriceDetails {
  currencyCode:CurrencyCode,
  priceType:PriceType,
  modificationKey?:string|null,

  volume:number|null,
  periodSizeDays:number|null,
  minPrice:CurrencyAmountLike|null,
  lowPrice:CurrencyAmountLike|null,
  firstQuartile?:CurrencyAmountLike|null,
  price:CurrencyAmountLike|null,
  thirdQuartile?:CurrencyAmountLike|null,
  highPrice:CurrencyAmountLike|null,
  maxPrice:CurrencyAmountLike|null,
  stdDev?:CurrencyAmountLike|null,
  mean?:CurrencyAmountLike|null,
  median?:CurrencyAmountLike|null,

  lastUpdatedAt:Date|null,
  mostRecentPrice:Date|null,
  statIds:Array<string>|null,
  currenciesUsed:Array<CurrencyCode>|null,
}

export interface TcgPlayerPrices {
  currencyCode:CurrencyCode,
  low:CurrencyAmountLike|null, // low listing price
  mid:CurrencyAmountLike|null, // mid listing price
  high:CurrencyAmountLike|null,  // high listing price
  market:CurrencyAmountLike|null, // market price based on sales
  directLow:CurrencyAmountLike|null,
  lastUpdatedAt:Date|null,
  currencyCodeUsed:CurrencyCode,
}

export interface CardMarketPrices {
  currencyCode:CurrencyCode,
  averageSellPrice:CurrencyAmountLike|null,
  lowPrice:CurrencyAmountLike|null,
  trendPrice:CurrencyAmountLike|null,
  averageOneDay:CurrencyAmountLike|null,
  averageSevenDay:CurrencyAmountLike|null,
  averageThirtyDay:CurrencyAmountLike|null,
  lastUpdatedAt:Date|null,
  currencyCodeUsed:CurrencyCode,
}

export interface SourcedPrices {
  tcgPlayerPrices:Array<TcgPlayerPrices>,
  cardMarketPrices:Array<CardMarketPrices>,
  priceId:string|null,
}

export interface ItemPrices {
  prices:Array<ItemPriceDetails>
  modificationPrices?:Array<ItemPriceDetails>
  sourcedPrices?:SourcedPrices
}

export interface ItemPriceHistoryDetails {
  timestamp:Date,
  prices:Array<ItemPriceDetails>,
  modificationPrices?:Array<ItemPriceDetails>
}

// see https://www.gs1uk.org/support-training/support-for-growing-your-business-online/ultimate-guide-to-gtins-eans-and-upcs-for
export interface Identifiers {
  // the gtin that is used as default
  gtin?:string,
  // if the item has multiple different gtins (12 digit for US, 13 for rest of world for example) store them here
  gtins?:Array<string>,
  // common alias for the 12 digit North American gtin
  upc?:string
  // common alias for the 13 digit non North American gtin
  ean?:string,
  // manufacturer part number
  mpn?:string,
  // amazon product id
  asin?:string,
  // if some other identification system is used then itemId is the default identifier
  // but multiple can be stored in the itemIds field
  itemId?:string,
  itemIds?:Array<string>,
}

export interface ItemSort {
  ukPrice:number|null,
  ukSales:number|null,
  usPrice:number|null,
  usSales:number|null,
  name:string,
}

export interface ItemEntity extends MongoEntity {
  slug:string|null,
  slugs:Array<string>,
  slugSuffixId:string|null,

  visible:boolean,
  name:string,
  displayName:string,
  description:string|null,

  searchKeywords:SearchKeywords,
  identifiers:Identifiers,
  allIdentifiers?:Array<string>

  itemType:ItemTypeV2,
  itemDetails:any,

  nextPokePriceCalculationTime:Date,
  nextStatsCalculationTime:Date,
  nextEbayOpenListingSourcingTime:Date,
  nextEbayOpenListingArchiveTime?:Date,
  nextHistoricalPriceArchiveTime?:Date,

  images:Images
  pokePrices:Array<PokePrice>,
  pokePriceOverrides?:Array<PokePriceOverride>,
  itemPrices:ItemPrices
  itemPriceHistory?:Array<ItemPriceHistoryDetails>
  metadata:any,

  sort:ItemSort,
  tags:Array<string>,
  searchTags:Array<SearchTag>,

  relatedItems:RelatedItems
  nextItem:RelatedItem|null,
  previousItem:RelatedItem|null,
}

export const legacyIdOrFallback = (item:ItemEntity) => item.legacyId ?? item._id.toString()
export const itemIdsWithLegacyIds = (items:Array<ItemEntity>):Array<string> => {
  return [...itemOrLegacyIdToItem(items).keys()]
}
export const itemOrLegacyIdToItem = (items:Array<ItemEntity>):Map<string,ItemEntity> => {
  const idToItem = new Map<string, ItemEntity>()
  items.forEach(item => {
    idToItem.set(item._id.toString(), item)
    if (item.legacyId) {
      idToItem.set(item.legacyId, item)
    }
  })
  return idToItem;
}

export type ItemTypeV2 = GenericItemType|SinglePokemonCardItemType

export enum CardLanguage {
  ENGLISH = 'ENGLISH',
  JAPANESE = 'JAPANESE',
}

export const languageOrFallback = (language:CardLanguage|undefined|null):CardLanguage => {
  if (!language) {
    return CardLanguage.ENGLISH
  }
  return language
}

export interface SingleCardItemDetails {
  setId:string,
  series:string,
  set:string,
  setCode:string,
  cardNumber:string,
  variant:CardVariant,
  language?:CardLanguage, // if undefined, assume ENGLISH
  setNumber:string,
  superType:string,
  subTypes:Array<string>,
  energyTypes:Array<string>,
  pokemon:Array<string>,
  artist:string|null,
  rarity:string|null,
  flavourText:string|null,
  setDetails:SetDetails,
}

export interface SetDetails {
  setId:string,
  name:string,
  setCode?:string|null,
  imageUrl:string,
  backgroundImageUrl:string|null
  symbolUrl:string|null,
  releaseDate:Date,
}

const COLLECTION_NAME = 'item';

const result = mongoRepositoryFactory.build<ItemEntity>(COLLECTION_NAME);
export const itemRepository = result.repository;
export const itemDeleter = result.deleter;

export const baseItemCreator:EntityCreator<ItemEntity> = {
  create: async newEntity => {
    const createdEntity = await result.creator.create(newEntity)
    await onItemCreateHandler.afterCreate(createdEntity)
    return createdEntity;
  },
}

export const itemUpdater:EntityUpdater<ItemEntity> = {
  updateOnly: async (id, update) => {
    const updatedItem = await result.updater.updateAndReturn(id, update)
    await onItemUpdateHandler.onItemUpdate(result.updater.updateOnly, updatedItem)
  },
  updateAndReturn: async (id, update) => {
    const updatedItem = await result.updater.updateAndReturn(id, update)
    await onItemUpdateHandler.onItemUpdate(result.updater.updateOnly, updatedItem)
    return byIdRetriever.retrieveMongo(itemRepository, id)
  },
};
