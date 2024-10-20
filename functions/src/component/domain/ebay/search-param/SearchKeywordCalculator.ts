import {SearchParams} from "./EbayCardSearchParamEntity";
import {CardVariant, SearchKeywords} from "../../card/CardEntity";
import {toInputValueSet} from "../../../tools/SetBuilder";
import {SetEntity} from "../../set/SetEntity";
import {GlobalExcludeKeywordEntity} from "./global-exclude/GlobalExcludeKeywordEntity";
import {flattenArray} from "../../../tools/ArrayFlattener";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../../marketplace/item-details/SinglePokemonCardItemDetails";
import {ItemEntity, SingleCardItemDetails} from "../../item/ItemEntity";
import {cardItemRetriever} from "../../item/CardItemRetriever";

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

const calculateIncludesFromItem = (item:ItemEntity):Array<string> => {
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
  const displaySetNumberKeyword = `(${card.setNumber},${tripleFormatSetNumber})`;
  const includes = item.searchKeywords.includes;
  return [numberKeyword, displaySetNumberKeyword]
    .concat(fullNameKeywords)
    .concat(variantKeywords)
    .concat(includes);
}

const calculateExcludesFromItem = (item:ItemEntity):Array<string> => {
  if (item.itemType !== SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return []
  }
  const cardVariant = item.itemDetails.variant
  const variantExcludes = flattenArray(
    Object.keys(CardVariant)
      .filter(variant => variant !== cardVariant && variant !== CardVariant.HOLO) // don't use holo when creating search params
      // @ts-ignore
      .map(variant => calculateVariantKeywords(variant))
  )

  const excludes = item.searchKeywords.excludes;
  return excludes
    .concat(variantExcludes);
}

const mapSearchKeywordsToSearchParams = (searchKeywords:SearchKeywords):SearchParams => {
  const ignoreSet = toInputValueSet(searchKeywords.ignores);
  return {
    includeKeywords: searchKeywords.includes.filter(word => !ignoreSet.has(word)),
    excludeKeywords: searchKeywords.excludes.filter(word => !ignoreSet.has(word)),
  }
}

const calculateFromEntities = (item:ItemEntity, set:SetEntity, global:GlobalExcludeKeywordEntity):SearchParams => {
  // const ignores = toInputValueSet(
  //   item.searchKeywords.ignores
  //     .concat(set.searchKeywords.ignores)
  // );
  // const includes = lodash.uniq(
  //   calculateIncludesFromItem(item)
  //     .concat(set.searchKeywords.includes)
  //     .filter(include => !ignores.has(include))
  // )
  // const includesSet = toInputValueSet(includes)
  // const excludes = lodash.uniq(
  //   calculateExcludesFromItem(item)
  //     .concat(set.searchKeywords.excludes)
  //     .concat(global.excludes)
  //     .filter(exclude => !ignores.has(exclude) && !includesSet.has(exclude))
  // );
  // return {
  //   includeKeywords: includes,
  //   excludeKeywords: excludes,
  // }

  return mapSearchKeywordsToSearchParams(item.searchKeywords)
}

const calculate = async (itemId:string):Promise<SearchParams> => {
  const item = await cardItemRetriever.retrieve(itemId);
  return mapSearchKeywordsToSearchParams(item.searchKeywords)

  // if (item.itemType === SINGLE_POKEMON_CARD_ITEM_TYPE) {
  //   const setId = item.itemDetails.setId
  //   const set = await setRetriever.retrieve(setId);
  //   const global = await globalExcludeKeywordRetriever.retrieve();
  //   return calculateFromEntities(item, set, global);
  // }
  // if (item.itemType === GENERIC_ITEM_TYPE) {
  //   return mapSearchKeywordsToSearchParams(item.searchKeywords)
  // }
  // throw new UnexpectedError(`Item with id: ${item._id.toString()} has invalid item type: ${item.itemType}, for creating search params`)
}

export const searchKeywordCalculator = {
  calculate,
  calculateFromEntities,
  mapSearchKeywordsToSearchParams,
}