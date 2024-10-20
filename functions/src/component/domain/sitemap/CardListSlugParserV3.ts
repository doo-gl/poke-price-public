import {CardRequest} from "../card/PublicCardDtoRetrieverV2";
import {CardVariant} from "../card/CardEntity";
import {
  ListingPriceValueTag,
  ListingVolumeValueTag,
  SoldPriceValueTag,
  SoldVolumeValueTag, SupplyVsDemandValueTag, TotalCirculationValueTag, VolatilityValueTag,
} from "../card/query/ValueTagExtractor";
import {toInputValueMap} from "../../tools/MapBuilder";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";


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
  listingPrice:ListingPriceValueTag|null,
  listingVolume:ListingVolumeValueTag|null,
  soldPrice:SoldPriceValueTag|null,
  soldVolume:SoldVolumeValueTag|null,
  supplyVsDemand:SupplyVsDemandValueTag|null,
  totalCirculation:TotalCirculationValueTag|null,
  volatility:VolatilityValueTag|null,
}

interface Suffixes {
  series:string|null,
  set:string|null,
  artist:string|null,
  name:string|null,
  pokemon:string|null,
  number:string|null,
  setNumber:string|null,
  subType:string|null,
  rarity:string|null,
  energyType:string|null,
  superType:string|null,
}

interface Matcher {
  key: () => string,
  matchValue: (value:string) => string|null,
  toSlugPart: (value:string) => string,
}

const extract = (regex:RegExp):(prefix:string) => string|null => {
  return (prefix:string) => {
    const newRegex = new RegExp(regex)
    const match = newRegex.exec(prefix);
    if (!match) {
      return null;
    }
    return match[1]
  }
}

const prefixMatcher = (key:string, allowedValues:Array<string>):Matcher => {
  const toSlugPart = (value:string) => value.toLowerCase().replace(/_/gim, '-')
  const matchValue = (value:string) => {
    const matchedValue = extract(new RegExp(`(${allowedValues.map(toSlugPart).join('|')})`, 'gim'))(value);
    if (!matchedValue) {
      return null;
    }
    const slugPartToAllowedValue = toInputValueMap(allowedValues, toSlugPart);
    const allowedValue = slugPartToAllowedValue.get(matchedValue)
    if (!allowedValue) {
      return null;
    }
    return allowedValue;
  }
  return {
    key: () => key,
    matchValue,
    toSlugPart,
  }
}

const suffixMatcher = (key:string, template:(value:string) => string):Matcher => {
  return {
    key: () => key,
    matchValue: extract(new RegExp(template('([a-zA-Z0-9é\\-]+)'), 'gim')),
    toSlugPart: template,
  }
}

const PREFIX_MATCHERS:Array<Matcher> = [
  prefixMatcher('sort', Object.values(SlugSort)),
  prefixMatcher('variant', Object.values(CardVariant)),
  prefixMatcher('listingPrice', Object.values(ListingPriceValueTag)),
  prefixMatcher('listingVolume', Object.values(ListingVolumeValueTag)),
  prefixMatcher('soldPrice', Object.values(SoldPriceValueTag)),
  prefixMatcher('soldVolume', Object.values(SoldVolumeValueTag)),
  prefixMatcher('supplyVsDemand', Object.values(SupplyVsDemandValueTag)),
  prefixMatcher('totalCirculation', Object.values(TotalCirculationValueTag)),
  prefixMatcher('volatility', Object.values(VolatilityValueTag)),
];

const SUFFIX_MATCHERS:Array<Matcher> = [
  suffixMatcher('series', value => `in-${value}-series`),
  suffixMatcher('set', value => `in-${value}-set`),
  suffixMatcher('name', value => `named-${value}`),
  suffixMatcher('number', value => `with-card-number-${value}`),
  suffixMatcher('setNumber', value => `with-set-number-${value}`),
  suffixMatcher('subType', value => `with-${value}-sub-type`),
  suffixMatcher('pokemon', value => `including-pokemon-called-${value}`),
  suffixMatcher('artist', value => `by-artist-${value}`),
  suffixMatcher('rarity', value => `with-${value}-rarity`),
  suffixMatcher('energyType', value => `with-${value}-energy-type`),
  suffixMatcher('superType', value => `with-${value}-super-type`),
];

const KEY_TO_PREFIX_MATCHER = toInputValueMap(PREFIX_MATCHERS, matcher => matcher.key());
const KEY_TO_SUFFIX_MATCHER = toInputValueMap(SUFFIX_MATCHERS, matcher => matcher.key());

const parseCardCode = (value:string):{cardNumber:string,setNumber:string}|null => {
  const cardCodeMatch = value.match(/with-card-code-([a-z0-9]+)-([a-z0-9]+)/)
  if (!cardCodeMatch) {
    return null
  }
  const cardNumber = cardCodeMatch[1];
  const setNumber = cardCodeMatch[2];
  return { cardNumber, setNumber }
}

const parsePrefix = (prefix:string|null):Prefixes => {
  const result:any = {
    sort: null,
    variant: null,
    listingPrice: null,
    listingVolume: null,
    soldPrice: null,
    soldVolume: null,
    supplyVsDemand: null,
    totalCirculation: null,
    volatility: null,
  }
  if (!prefix) {
    return result;
  }

  const trimmedPrefix = prefix.endsWith('--') ? prefix.slice(0, prefix.length - 2) : prefix;

  PREFIX_MATCHERS.forEach(matcher => {
    trimmedPrefix.split('--').forEach(prefixPart => {
      const matchedValue = matcher.matchValue(prefixPart);
      if (!matchedValue) {
        return;
      }
      result[matcher.key()] = matchedValue
    })
  })

  return result
}

const parseSuffix = (suffix:string|null):Suffixes => {
  const result:any = {
    series: null,
    set: null,
    name: null,
    number: null,
    setNumber: null,
    artist: null,
    pokemon: null,
    subType: null,
    energyType: null,
    rarity: null,
    superType: null,
  }
  if (!suffix) {
    return result;
  }

  const trimmedSuffix = suffix.startsWith('--') ? suffix.slice(2) : suffix;

  SUFFIX_MATCHERS.forEach(matcher => {
    trimmedSuffix.split('--').forEach(suffixPart => {
      const matchedValue = matcher.matchValue(suffixPart);
      if (!matchedValue) {
        return;
      }
      result[matcher.key()] = matchedValue
    })
  })

  const cardCode = parseCardCode(suffix);
  if (cardCode) {
    result.number = cardCode.cardNumber;
    result.setNumber = cardCode.setNumber;
  }

  return result
}

const parse = (cardSlug:string):ParsedCardSlugKeywords => {

  const prefixSuffixMatch = cardSlug.match(/(.*)(pokemon-cards|pokemon-card-list)(.*)/)
  if (!prefixSuffixMatch) {
    return {
      request: {},
      sort: null,
      keywords: ['top', 'pokemon', 'cards'],
    }
  }

  const prefix = prefixSuffixMatch[1];
  const suffix = prefixSuffixMatch[3];

  const prefixResult = parsePrefix(prefix)
  const suffixResult = parseSuffix(suffix)

  return {
    keywords: cardSlug.split(/-|--/gim),
    sort: prefixResult.sort,
    request: {
      series: suffixResult.series ?? undefined,
      set: suffixResult.set ?? undefined,
      number: suffixResult.number ?? undefined,
      setNumber: suffixResult.setNumber ?? undefined,
      name: suffixResult.name ?? undefined,
      variant: prefixResult.variant ?? undefined,
      artist: suffixResult.artist ?? undefined,
      energyType: suffixResult.energyType ? [suffixResult.energyType] : undefined,
      rarity: suffixResult.rarity ?? undefined,
      pokemon: suffixResult.pokemon ? [suffixResult.pokemon] : undefined,
      subType: suffixResult.subType ? [suffixResult.subType] : undefined,
      superType: suffixResult.superType ?? undefined,
      soldPrice: prefixResult.soldPrice ?? undefined,
      soldVolume: prefixResult.soldVolume ?? undefined,
      listingPrice: prefixResult.listingPrice ?? undefined,
      listingVolume: prefixResult.listingVolume ?? undefined,
      supplyVsDemand: prefixResult.supplyVsDemand ?? undefined,
      totalCirculation: prefixResult.totalCirculation ?? undefined,
      volatility: prefixResult.volatility ?? undefined,
    },
  }
}

const mapToCanonicalSlug = (request:CardRequest):string => {
  const prefixSlugParts:Array<{keyValue:string, slugPart:string}> = [];
  const suffixSlugParts:Array<{keyValue:string, slugPart:string}> = [];

  const readValue = (val:any) => {
    if (val === null || val === undefined) {
      return null;
    }
    if (Array.isArray(val)) {
      if (val.length > 0) {
        return val[0]
      }
    }
    return val;
  }

  Object.entries(request).forEach(entry => {
    const key = entry[0];
    const value = readValue(entry[1]);
    if (value === null || value === undefined) {
      return;
    }
    const preMatcher = KEY_TO_PREFIX_MATCHER.get(key);
    const sufMatcher = KEY_TO_SUFFIX_MATCHER.get(key);

    if (preMatcher) {
      prefixSlugParts.push({
        keyValue: `${key}|${value}`,
        slugPart: preMatcher.toSlugPart(value),
      })
    }
    if (sufMatcher) {
      suffixSlugParts.push({
        keyValue: `${key}|${value}`,
        slugPart: sufMatcher.toSlugPart(value),
      })
    }
  })
  const prefix = prefixSlugParts
    .sort(comparatorBuilder.objectAttributeASC(val => val.keyValue))
    .map(val => val.slugPart)
    .join('--')
  const suffix = suffixSlugParts
    .sort(comparatorBuilder.objectAttributeASC(val => val.keyValue))
    .map(val => val.slugPart)
    .join('--')

  return `${prefix}${prefix.length > 0 ? '--' : ''}pokemon-cards${suffix.length > 0 ? '--' : ''}${suffix}`
}

export const cardListSlugParserV3 = {
  parse,
  mapToCanonicalSlug,
}