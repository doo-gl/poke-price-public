import {Create} from "../../../database/mongo/MongoEntity";
import {CardLanguage, ItemEntity, SingleCardItemDetails} from "../ItemEntity";
import {CardVariant, SearchKeywords} from "../../card/CardEntity";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../../marketplace/item-details/SinglePokemonCardItemDetails";
import {flattenArray} from "../../../tools/ArrayFlattener";
import {dedupeInOrder} from "../../../tools/ArrayDeduper";


const GLOBAL_CARD_EXCLUDES = ["staff", "stamp", "stamped", "jumbo", "description", "proxy", "p.roxy", "repack", "custom",
  "gold+metal", "*p.r.o.x.y.*", "ptcgo", "fake", "replica", "toys", "set", "pick", "selection", "cards", "singles",
  "x2", "x3", "x4", "x5", "x6", "x7", "x8", "x9", "2x", "3x", "4x", "5x", "6x", "7x", "8x", "9x", "playset",
  "any", "holos", "rares", "choose", "lot", "bundle", "holo's", "complete", "god", "fat", "multi", "damaged",
  "italian", "italiano", "carta", "ita", "italiana", "italiane", "carte", "german", "karte", "Deustch",
  "deutsch", "sonne", "french", "Française", "fr", "francaise", "Français", "francais", "solei", "soleil", "portuguese",
  "pre-release", "prerelease", "sets", "digital", "online", "miscut", "blocks", "block", "folder", "misprint",
  "4th+place", "3rd+place", "2nd+place", "1st+place", "world+championships", "world+championship", "league+championship",
  "andycards", "pv*", "*pv", "PR0XY", "korean", "chinese", 'fan+art', 'keychain', 'aluminium+sticker', 'fanart',
  'extended+artwork', 'no+card+or+packs', 'black+shorts',
]

const JAPANESE_KEYWORDS = [
  "japanese", "japan",
]

const REVERSE_HOLO_KEYWORDS = [
  'reverse',
  'rev',
  'reversed',
  'rverse',
]
const SHADOWLESS_KEYWORDS = [
  'shadowless',
]
const FIRST_EDITION_KEYWORDS = [
  'first',
  '1st',
  '1ED',
]
const HOLO_KEYWORDS = [
  'holo',
]


const convertNumberToTripleFormat = (numberInSet:string):string => {
  const numberMatch = new RegExp(/([\d]+)/).exec(numberInSet);
  if (!numberMatch || numberMatch.length < 2) {
    return numberInSet
  }
  const number = numberMatch[1];
  if (number.length > 3) {
    return numberInSet;
  }
  const paddedNumber = number.padStart(3, '0');
  return numberInSet.replace(number, paddedNumber);
}

const calculateNameIncludeKeywords = (displayName:string|null):Array<string> => {
  if (!displayName) {
    return [];
  }
  const split = displayName.split(' ');
  const filtered = split.filter(keyword => {
    const regex = new RegExp(/[a-zA-Z0-9',.é:\\-]+/gim);
    return regex.exec(keyword);
  })
  const mapped = filtered.map(keyword => {
    if (new RegExp(/[,.:'é\\-]/gim).exec(keyword)) {
      if (keyword.includes('-')) {
        return `(${keyword},${keyword.replace(/[,.:'é\\-]/gim, '')},${keyword.replace(/[,.:'é]/gim, '').replace(/[\\-]/gim, ' ')})`;
      } else if (keyword.includes('é')) {
        return `(${keyword},${keyword.replace(/[,.:'é\\-]/gim, '')},${keyword.replace(/[,.:']/gim, '').replace(/[é]/gim, 'e')})`;
      } else {
        return `(${keyword},${keyword.replace(/[,.:'é\\-]/gim, '')})`;
      }
    }
    return keyword;
  })
  return mapped;
}

const calculateVariantKeywords = (variant:CardVariant):Array<string> => {
  switch (variant) {
    case CardVariant.DEFAULT:
      return []
    case CardVariant.FIRST_EDITION:
      return FIRST_EDITION_KEYWORDS
    case CardVariant.HOLO:
      return HOLO_KEYWORDS
    case CardVariant.REVERSE_HOLO:
      return REVERSE_HOLO_KEYWORDS
    case CardVariant.SHADOWLESS:
      return SHADOWLESS_KEYWORDS
    default:
      return []
  }
}

const orGroup = (keywords:Array<string>):string => {
  if (keywords.length === 0) {
    return ''
  }
  if (keywords.length === 1) {
    return keywords[0]
  }
  return `(${keywords.join(',')})`
}

const VARIANT_OR_GROUPS = new Set<string>([
  orGroup(FIRST_EDITION_KEYWORDS),
  orGroup(HOLO_KEYWORDS),
  orGroup(REVERSE_HOLO_KEYWORDS),
  orGroup(SHADOWLESS_KEYWORDS),
])

const calculateIncludesFromItem = (item:Create<ItemEntity>|ItemEntity):Array<string> => {
  if (item.itemType !== SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return item.searchKeywords.includes
  }
  const card = item.itemDetails as SingleCardItemDetails
  const number = card.cardNumber;
  const tripleFormatNumber =  convertNumberToTripleFormat(number);
  const numberKeyword = `(${number},${tripleFormatNumber})`;
  const variantKeywords = calculateVariantKeywords(card.variant).length > 0
    ? [orGroup(calculateVariantKeywords(card.variant))]
    : [];
  const fullNameKeywords = calculateNameIncludeKeywords(item.displayName)
  const tripleFormatSetNumber =  convertNumberToTripleFormat(card.setNumber);
  const displaySetNumberKeyword = card.setNumber.length > 0
    ? `(${card.setNumber},${tripleFormatSetNumber})`
    : ''

  const languageIncludes = card.language === CardLanguage.JAPANESE
    ? [orGroup(JAPANESE_KEYWORDS)]
    : []

  // filter the variant or groups out of the item includes
  // so that if the input item was originally some other variant, we use the correct variant based on it's variant set in details
  const includes = item.searchKeywords.includes
    .filter(keyword => !VARIANT_OR_GROUPS.has(keyword));
  return [numberKeyword, displaySetNumberKeyword]
    .concat(fullNameKeywords)
    .concat(variantKeywords)
    .concat(languageIncludes)
    .concat(includes);
}

const calculateExcludesFromItem = (item:Create<ItemEntity>|ItemEntity):Array<string> => {
  if (item.itemType !== SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return []
  }
  const card = item.itemDetails as SingleCardItemDetails
  const cardVariant = card.variant
  const keywordsToExcludeOtherVariants = flattenArray(
    Object.keys(CardVariant)
      .filter(variant => variant !== cardVariant && variant !== CardVariant.HOLO) // don't use holo when creating search params
      // @ts-ignore
      .map(variant => calculateVariantKeywords(variant))
  )
  const includeKeywordsForThisVariant = new Set<string>(calculateVariantKeywords(cardVariant))

  const keywordsToExcludeOtherLanguages = card.language !== CardLanguage.JAPANESE
    ? JAPANESE_KEYWORDS
    : []

  // filter the variant or groups out of the item excludes
  // so that if the input item was originally some other variant,
  // we use the correct variant based on it's variant set in details
  // also ensure that the excludes for this item do not exclude the include keywords
  const excludes = item.searchKeywords.excludes
    .filter(keyword => !VARIANT_OR_GROUPS.has(keyword))
    .filter(keyword => !includeKeywordsForThisVariant.has(keyword))
  return excludes
    .concat(keywordsToExcludeOtherVariants)
    .concat(keywordsToExcludeOtherLanguages)
}

const generate = (item:Create<ItemEntity>|ItemEntity):SearchKeywords => {
  if (item.itemType !== SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return item.searchKeywords
  }
  const itemIncludes = calculateIncludesFromItem(item)
  const itemExcludes = calculateExcludesFromItem(item)
  const includes = dedupeInOrder(itemIncludes, i => i)
  const excludes = dedupeInOrder(itemExcludes.concat(GLOBAL_CARD_EXCLUDES), i => i)
  return {
    includes,
    excludes,
    ignores: item.searchKeywords.ignores,
  }
}

export const pokemonCardKeywordGenerator = {
  generate,
}