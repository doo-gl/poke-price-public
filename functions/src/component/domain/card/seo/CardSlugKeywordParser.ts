import {CardRequest} from "../PublicCardDtoRetrieverV2";
import {CardVariant} from "../CardEntity";
import {cardQueryMetadataRetriever} from "../query/CardQueryMetadataRetriever";
import {CardQueryMetadataEntity} from "../query/CardQueryMetadataEntity";

export enum SlugSort {
  MOST_VALUABLE = 'MOST_VALUABLE',
  LEAST_VALUABLE = 'LEAST_VALUABLE',
  MOST_TRADED = 'MOST_TRADED',
  LEAST_TRADED = 'LEAST_TRADED',
}

export interface ParsedCardSlugKeywords {
  sort:SlugSort|null,
  request:CardRequest,
  keywords:Array<string>,
}

interface Prefixes {
  sort:SlugSort|null,
  variant:CardVariant|null,
  rarity:string|null,
  energyType:string|null,
  superType:string|null,
}

interface Suffixes {
  series:string|null,
  set:string|null,
  artist:string|null,
  name:string|null,
  pokemon:string|null,
  cardNumber:string|null,
  setNumber:string|null,
  subType:string|null,
  listingPrice:string|null,
  listingVolume:string|null,
  soldPrice:string|null,
  soldVolume:string|null,
  supplyVsDemand:string|null,
  totalCirculation:string|null,
  volatility:string|null,
}

const parseCardCode = (value:string):{cardNumber:string,setNumber:string}|null => {
  const cardCodeMatch = value.match(/with-card-code-([a-z0-9]+)-([a-z0-9]+)/)
  if (!cardCodeMatch) {
    return null
  }
  const cardNumber = cardCodeMatch[1];
  const setNumber = cardCodeMatch[2];
  return { cardNumber, setNumber }
}

const findMatchingMetadataValue = (metadatas:Array<CardQueryMetadataEntity>, key:string, valueMatcher:(value:string) => boolean):string|null => {
  const metadata = metadatas.find(meta => meta.key === key)
  if (!metadata) {
    return null;
  }
  return metadata.values
    .find(value => valueMatcher(value.value))?.value ?? null
}

const parsePrefix = (prefix:string|null, metadata:Array<CardQueryMetadataEntity>):Prefixes => {
  const result:Prefixes = {
    sort: null,
    energyType: null,
    rarity: null,
    superType: null,
    variant: null,
  }
  if (!prefix) {
    return result;
  }

  if (prefix.startsWith('most-valuable')) {
    result.sort = SlugSort.MOST_VALUABLE;
  } else if (prefix.startsWith('least-valuable')) {
    result.sort = SlugSort.LEAST_VALUABLE;
  } else if (prefix.startsWith('most-traded')) {
    result.sort = SlugSort.MOST_TRADED;
  } else if (prefix.startsWith('least-traded')) {
    result.sort = SlugSort.LEAST_TRADED;
  }

  result.energyType = findMatchingMetadataValue(metadata, 'energyType', value => prefix.includes(value))
  result.rarity = findMatchingMetadataValue(metadata, 'rarity', value => prefix.includes(value))
  result.superType = findMatchingMetadataValue(metadata, 'superType', value => prefix.includes(value))
  if (!result.superType && prefix.includes('pokemon')) {
    result.superType = 'pokémon'
  }

  if (prefix.includes('reverse-holo')) {
    result.variant = CardVariant.REVERSE_HOLO
  } else if (prefix.includes('standard')) {
    result.variant = CardVariant.DEFAULT
  }

  return result
}

const toSlug = (value:string):string => {
  return value.toLowerCase().replace(/_/gim, '-')
}

const parseSuffix = (suffix:string|null, metadata:Array<CardQueryMetadataEntity>):Suffixes => {
  const result:Suffixes = {
    series: null,
    set: null,
    name: null,
    cardNumber: null,
    setNumber: null,
    artist: null,
    pokemon: null,
    subType: null,
    soldPrice: null,
    soldVolume: null,
    listingPrice: null,
    listingVolume: null,
    supplyVsDemand: null,
    totalCirculation: null,
    volatility: null,
  }
  if (!suffix) {
    return result;
  }
  result.series = findMatchingMetadataValue(metadata, 'series', value => !!suffix.match(new RegExp(`in-${value}-series`)))
  result.set = findMatchingMetadataValue(metadata, 'set', value => !!suffix.match(new RegExp(`in-${value}-set`)))
  result.name = findMatchingMetadataValue(metadata, 'name', value => !!suffix.match(new RegExp(`named-${value}`)))
  result.cardNumber = findMatchingMetadataValue(metadata, 'cardNumber', value => !!suffix.match(new RegExp(`with-card-number-${value}`)))
  result.setNumber = findMatchingMetadataValue(metadata, 'setNumber', value => !!suffix.match(new RegExp(`with-set-number-${value}`)))
  result.subType = findMatchingMetadataValue(metadata, 'subType', value => !!suffix.match(new RegExp(`with-${value}-type`)))
  result.pokemon = findMatchingMetadataValue(metadata, 'pokemon', value => !!suffix.match(new RegExp(`including-pokemon-called-${value}`)))
  result.artist = findMatchingMetadataValue(metadata, 'artist', value => !!suffix.match(new RegExp(`by-artist-${value}`)))
  result.soldPrice = findMatchingMetadataValue(metadata, 'soldPrice', value => !!suffix.match(new RegExp(`that-are-${toSlug(value)}`)))
  result.soldVolume = findMatchingMetadataValue(metadata, 'soldVolume', value => !!suffix.match(new RegExp(`that-are-${toSlug(value)}`)))
  result.listingPrice = findMatchingMetadataValue(metadata, 'listingPrice', value => !!suffix.match(new RegExp(`available-for-a-${toSlug(value)}`)))
  result.listingVolume = findMatchingMetadataValue(metadata, 'listingVolume', value => !!suffix.match(new RegExp(`that-are-${toSlug(value)}`)))
  result.supplyVsDemand = findMatchingMetadataValue(metadata, 'supplyVsDemand', value => !!suffix.match(new RegExp(`with-a-${toSlug(value)}`)))
  result.totalCirculation = findMatchingMetadataValue(metadata, 'totalCirculation', value => !!suffix.match(new RegExp(`with-a-${toSlug(value)}`)))
  result.volatility = findMatchingMetadataValue(metadata, 'volatility', value => !!suffix.match(new RegExp(`that-are-${toSlug(value)}`)))

  const cardCode = parseCardCode(suffix);
  if (cardCode) {
    result.cardNumber = cardCode.cardNumber;
    result.setNumber = cardCode.setNumber;
  }

  return result
}

const parse = async (cardSlug:string):Promise<ParsedCardSlugKeywords> => {

  const prefixSuffixMatch = cardSlug.match(/(.*)(pokemon-cards|pokemon-card-list)(.*)/)
  if (!prefixSuffixMatch) {
    return {
      request: {},
      sort: null,
      keywords: ['top', 'pokemon', 'cards'],
    }
  }

  const queryMetadata = await cardQueryMetadataRetriever.retrieveAll()

  const prefix = prefixSuffixMatch[1];
  const suffix = prefixSuffixMatch[3];

  const prefixResult = parsePrefix(prefix, queryMetadata)
  const suffixResult = parseSuffix(suffix, queryMetadata)

  return {
    keywords: cardSlug.split('-'),
    sort: prefixResult.sort,
    request: {
      series: suffixResult.series ?? undefined,
      set: suffixResult.set ?? undefined,
      number: suffixResult.cardNumber ?? undefined,
      setNumber: suffixResult.setNumber ?? undefined,
      name: suffixResult.name ?? undefined,
      variant: prefixResult.variant ?? undefined,
      artist: suffixResult.artist ?? undefined,
      energyType: prefixResult.energyType ? [prefixResult.energyType] : undefined,
      rarity: prefixResult.rarity ?? undefined,
      pokemon: suffixResult.pokemon ? [suffixResult.pokemon] : undefined,
      subType: suffixResult.subType ? [suffixResult.subType] : undefined,
      superType: prefixResult.superType ?? undefined,
      soldPrice: suffixResult.soldPrice ?? undefined,
      soldVolume: suffixResult.soldVolume ?? undefined,
      listingPrice: suffixResult.listingPrice ?? undefined,
      listingVolume: suffixResult.listingVolume ?? undefined,
      supplyVsDemand: suffixResult.supplyVsDemand ?? undefined,
      totalCirculation: suffixResult.totalCirculation ?? undefined,
      volatility: suffixResult.volatility ?? undefined,
    },
  }
}

export const cardSlugKeywordParser = {
  parse,
}