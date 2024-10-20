import {Create, Entity, Update} from "../../database/Entity";
import {CardDataSource} from "./CardDataSource";
import {Comparator, comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {UniqueCard} from "./UniqueCard";
import {SetId, UniqueSet} from "../set/UniqueSet";
import {CurrencyAmountLike} from "../money/CurrencyAmount";
import {JSONSchemaType} from "ajv";
import {capitaliseKey} from "../../tools/KeyConverter";
import {Timestamp} from "../../external-lib/Firebase";
import {CardLanguage, RelatedItem, RelatedItems} from "../item/ItemEntity";
import {TcgCollectorRegion} from "../tcg-collector/TcgCollectorWebScrapingClient";

export enum TagType {
  SYSTEM = 'SYSTEM'
}

const SERIES_COMPARATOR = comparatorBuilder.objectAttributeASC<CardEntity, string>(value => value.series);
const SET_COMPARATOR = comparatorBuilder.objectAttributeASC<CardEntity, string>(value => value.series);
const NUMBER_BEFORE_STRING_COMPARATOR = comparatorBuilder.objectAttributeASC<CardEntity, number>(value => {
  const firstLetter = value.numberInSet.slice(0, 1);
  if (!firstLetter || firstLetter.length === 0) {
    return Number.MAX_SAFE_INTEGER;
  }
  if (firstLetter.match(/[0-9]/gim)) {
    return -Number.MAX_SAFE_INTEGER
  }
  return Number.MAX_SAFE_INTEGER
})
const NUMBER_COMPARATOR = comparatorBuilder.objectAttributeASC<CardEntity, number>(value => {
  const stringWithNumbers = value.numberInSet.replace(/[^0-9]/gim, '');
  if (stringWithNumbers.length === 0) {
    return Number.MAX_SAFE_INTEGER;
  }
  try {
    return Number(stringWithNumbers)
  } catch (err:any) {
    return Number.MAX_SAFE_INTEGER;
  }
})
const STRING_COMPARATOR = comparatorBuilder.objectAttributeASC<CardEntity, string>(
  value => value.numberInSet.replace(/[0-9]/gim, '')
)
const VARIANT_COMPARATOR = comparatorBuilder.objectAttributeASC<CardEntity, string>(value => value.variant)

// Order by
// Series
// Set
// Number in set (putting non numbers at the end of the list)
// Variant
export const BY_NUMBER_CARD_COMPARATOR = comparatorBuilder.combineAll(
  SERIES_COMPARATOR,
  SET_COMPARATOR,
  NUMBER_BEFORE_STRING_COMPARATOR,
  NUMBER_COMPARATOR,
  STRING_COMPARATOR,
  VARIANT_COMPARATOR
)

export const TAG_COMPARATOR:Comparator<Tag> = comparatorBuilder.combine(
  comparatorBuilder.objectAttributeASC(tag => tag!.type),
  comparatorBuilder.objectAttributeASC(tag => tag!.value),
)

export type Tag = {
  value:string,
  type:TagType,
};

export type Image = {
  url:string,
  hiResUrl:string,
  fullUrl?:string,
  smallUrl?:string,
  tinyUrl?:string,
}

export interface ImageOverlay {
  url:string,
}

export enum CardVariant {
  DEFAULT = 'DEFAULT',
  REVERSE_HOLO = 'REVERSE_HOLO',
  POKE_BALL_HOLO = 'POKE_BALL_HOLO',
  MASTER_BALL_HOLO = 'MASTER_BALL_HOLO',
  SHADOWLESS = 'SHADOWLESS',
  FIRST_EDITION = 'FIRST_EDITION',
  HOLO = 'HOLO',
}

export interface PokemonTcgApiCardExternalIdentifiers {
  id:string,
  setCode:string,
  number:string,
  url:string,
}

export interface TcgCollectorCardExternalIdentifiers {
  id:string,
  url:string,
  expansionName:string,
  expansionUrl:string,
  expansionRegion:TcgCollectorRegion,
}

export type ExternalIdentifiers = {
  [key in CardDataSource]?: object;
};

export type CreateCardEntity = Create<CardEntity>;
export type UpdateCardEntity = Update<CardEntity>

export interface PokePrice {
  searchUrl:string|null,
  searchId:string|null,
  statsId:string,
  price:CurrencyAmountLike,
  minOpenPrice:CurrencyAmountLike|null,
  medianOpenPrice:CurrencyAmountLike|null,
  openListingVolume:number|null,
  shortViewMean:CurrencyAmountLike|null,
  shortViewStandardDeviation:CurrencyAmountLike|null,
  volume:number|null,
  openListingUrl:string|null,
}

export interface PokePriceV2 {
  soldPrice:CurrencyAmountLike|null,
  soldVolume:number|null,
  soldPeriodSizeDays:number|null,
  soldMinPrice:CurrencyAmountLike|null,
  soldLowPrice:CurrencyAmountLike|null,
  soldHighPrice:CurrencyAmountLike|null,
  soldMaxPrice:CurrencyAmountLike|null,
  soldLastUpdatedAt:Timestamp|null
  soldMostRecentPrice:Timestamp|null,
  soldStatIds:Array<string>|null,

  listingPrice:CurrencyAmountLike|null,
  listingVolume:number|null,
  listingPeriodSizeDays:number|null,
  listingMinPrice:CurrencyAmountLike|null,
  listingLowPrice:CurrencyAmountLike|null,
  listingHighPrice:CurrencyAmountLike|null,
  listingMaxPrice:CurrencyAmountLike|null,
  listingLastUpdatedAt:Timestamp|null,
  listingMostRecentPrice:Timestamp|null,
  listingStatIds:Array<string>|null,
}

export const searchKeywordsSchema:JSONSchemaType<SearchKeywords> = {
  type: "object",
  properties: {
    includes: { type: "array", items: { type: "string" } },
    excludes: { type: "array", items: { type: "string" } },
    ignores: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
  required: ["includes", "excludes", "ignores"],
}
export interface SearchKeywords {
  includes:Array<string>,
  excludes:Array<string>,
  ignores:Array<string>,
}

export interface SetDetails {
  setId:string,
  name:string,
  imageUrl:string,
  backgroundImageUrl:string|null
  symbolUrl:string,
  releaseDate:Timestamp,
}

export interface CardEntity extends Entity, UniqueCard, UniqueSet, SetId {
  name:string,
  countInSet:number,
  setDetails:SetDetails,
  // the number of total cards displayed on a card, like 10/109, is the 10th card of 109, 109 is the display set number
  // this is different from countInSet because some cards have values like 188/185 because they are 'secret'
  // also, total cards needs to take into account different variants within a single card.
  // also, some sets are written as SV16/SV94, so it needs to be a string.
  displaySetNumber:string,
  externalIdentifiers:ExternalIdentifiers,
  queryTags:{[name:string]:string},
  subType:string,
  subTypes:Array<string>,
  types:Array<string>,
  superType:string,
  pokemon:Array<string>,
  rarity:string|null,
  image:Image,
  imageOverlays:Array<ImageOverlay>,
  pokePrice:PokePrice|null,
  visible:boolean,
  fullName:string|null,
  displayName:string,
  artist:string|null,
  flavourText:string|null,
  searchKeywords:SearchKeywords,
  mostRecentEbayPriceSourcing:Timestamp,
  mostRecentEbayOpenListingSourcing:Timestamp,
  mostRecentStatCalculation:Timestamp,
  isUrlReviewed:boolean,
  priority:number,
  queryDetails:{[name:string]:string},
  pokePriceV2:PokePriceV2|null,
  soldUrl:string|null,
  listingUrl:string|null,
  nextPokePriceCalculationTime:Timestamp,
  nextStatsCalculationTime:Timestamp,
  nextEbayOpenListingSourcingTime:Timestamp,
  slug:string|null,
  nextCard:RelatedItem|null,
  previousCard:RelatedItem|null,
  slugs:Array<string>
  relatedCards:RelatedItems
}

export const toUniqueCardIdentifier = (card:CardEntity):UniqueCard => {
  return {
    series: card.series,
    set: card.set,
    numberInSet: card.numberInSet,
    variant: card.variant,
    language: CardLanguage.ENGLISH,
  }
}

export const extractCardName = (card:CardEntity) => {
  return !card.variant || card.variant === CardVariant.DEFAULT
    ? card.displayName
    : `${card.displayName} | ${formatVariant(card.variant)}`
}

export const formatVariant = (variant:CardVariant):string => {
  return capitaliseKey(variant).replace(/_/g, ' ')
}

export const extractCardNumber = (card:CardEntity) => {
  const hasSetNumber = card.displaySetNumber && card.displaySetNumber.length > 0;
  const startsWithLetter = card.numberInSet.match(/^[a-zA-Z]+/gim)
  const code = hasSetNumber && !startsWithLetter
    ? `${card.numberInSet.toUpperCase()} / ${card.displaySetNumber.toUpperCase()}`
    : card.numberInSet.toUpperCase();
  return code
}