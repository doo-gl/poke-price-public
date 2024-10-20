import {CardLanguage, ItemEntity, itemRepository, languageOrFallback, SingleCardItemDetails} from "./ItemEntity";
import {UniqueSet} from "../set/UniqueSet";
import {CardVariant} from "../card/CardEntity";
import {UniqueCard} from "../card/UniqueCard";
import {itemRetriever} from "./ItemRetriever";
import {ITEM_TYPE_SEARCH_TAG_KEY} from "./tag/ItemTagExtractor";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../marketplace/item-details/SinglePokemonCardItemDetails";
import {
  CARD_NUMBER_SEARCH_TAG_KEY,
  CARD_SERIES_SEARCH_TAG_KEY,
  CARD_SET_SEARCH_TAG_KEY,
  CARD_VARIANT_SEARCH_TAG_KEY,
  LANGUAGE_SEARCH_TAG_KEY,
} from "./tag/PokemonCardTagExtractor";
import {convertEnumToKey} from "../../tools/KeyConverter";
import {keyValueToTag} from "../search-tag/SearchTagEntity";
import {ObjectId} from "mongodb";


const retrieve = async (id:string):Promise<ItemEntity> => {
  if (ObjectId.isValid(id)) {
    return await itemRetriever.retrieveById(new ObjectId(id))
  } else {
    return await itemRetriever.retrieveByLegacyId(id)
  }
}

const retrieveOptional = async (id:string):Promise<ItemEntity|null> => {
  if (ObjectId.isValid(id)) {
    return await itemRetriever.retrieveOptionalById(new ObjectId(id))
  } else {
    return await itemRetriever.retrieveOptionalByLegacyId(id)
  }
}

const retrieveBySlug = async (slug:string):Promise<ItemEntity> => {
  return itemRetriever.retrieveBySlug(slug)
}

const retrieveOptionalBySlug = async (slug:string):Promise<ItemEntity|null> => {
  return itemRetriever.retrieveOptionalBySlug(slug)
}

const retrieveByUniqueSet = async (set:UniqueSet):Promise<Array<ItemEntity>> => {
  const items = await itemRetriever.retrieveForTags([
    keyValueToTag(ITEM_TYPE_SEARCH_TAG_KEY, SINGLE_POKEMON_CARD_ITEM_TYPE),
    keyValueToTag(CARD_SERIES_SEARCH_TAG_KEY, set.series),
    keyValueToTag(CARD_SET_SEARCH_TAG_KEY, set.set),
  ])
  return items;
}

const retrieveBySet = (series:string, set:string):Promise<Array<ItemEntity>> => {
  return retrieveByUniqueSet({series, set})
}

const retrieveBySeriesAndSetAndVariant = async (series:string, set:string, variant:CardVariant):Promise<Array<ItemEntity>> => {
  const items = await itemRetriever.retrieveForTags([
    keyValueToTag(ITEM_TYPE_SEARCH_TAG_KEY, SINGLE_POKEMON_CARD_ITEM_TYPE),
    keyValueToTag(CARD_SERIES_SEARCH_TAG_KEY, series),
    keyValueToTag(CARD_SET_SEARCH_TAG_KEY, set),
    keyValueToTag(CARD_VARIANT_SEARCH_TAG_KEY, convertEnumToKey(variant)),
  ])
  return items;
}

const retrieveBySetAndNumberAndVariant = async (set:string, cardNumber:string, variant:CardVariant):Promise<Array<ItemEntity>> => {
  const items = await itemRetriever.retrieveForTags([
    keyValueToTag(ITEM_TYPE_SEARCH_TAG_KEY, SINGLE_POKEMON_CARD_ITEM_TYPE),
    keyValueToTag(CARD_SET_SEARCH_TAG_KEY, set),
    keyValueToTag(CARD_NUMBER_SEARCH_TAG_KEY, cardNumber.toLowerCase()),
    keyValueToTag(CARD_VARIANT_SEARCH_TAG_KEY, convertEnumToKey(variant)),
  ])
  return items;
}

const retrieveBySetId = (setId:string):Promise<Array<ItemEntity>> => {
  return itemRepository.getMany({
    itemType: SINGLE_POKEMON_CARD_ITEM_TYPE,
    'itemDetails.setId': setId,
  })
}

const retrieveByUniqueCard = async (card:UniqueCard):Promise<ItemEntity> => {
  const item = await itemRetriever.retrieveOneForTags([
    keyValueToTag(ITEM_TYPE_SEARCH_TAG_KEY, SINGLE_POKEMON_CARD_ITEM_TYPE),
    keyValueToTag(CARD_SERIES_SEARCH_TAG_KEY, card.series),
    keyValueToTag(CARD_SET_SEARCH_TAG_KEY, card.set),
    keyValueToTag(CARD_NUMBER_SEARCH_TAG_KEY, card.numberInSet.toLowerCase()),
    keyValueToTag(CARD_VARIANT_SEARCH_TAG_KEY, convertEnumToKey(card.variant)),
    keyValueToTag(LANGUAGE_SEARCH_TAG_KEY, convertEnumToKey(card.language)),
  ])
  return item;
}

const retrieveOptionalByUniqueCard = (card:UniqueCard):Promise<ItemEntity|null> => {
  return itemRetriever.retrieveOptionalOneForTags([
    keyValueToTag(ITEM_TYPE_SEARCH_TAG_KEY, SINGLE_POKEMON_CARD_ITEM_TYPE),
    keyValueToTag(CARD_SERIES_SEARCH_TAG_KEY, card.series),
    keyValueToTag(CARD_SET_SEARCH_TAG_KEY, card.set),
    keyValueToTag(CARD_NUMBER_SEARCH_TAG_KEY, card.numberInSet.toLowerCase()),
    keyValueToTag(CARD_VARIANT_SEARCH_TAG_KEY, convertEnumToKey(card.variant)),
    keyValueToTag(LANGUAGE_SEARCH_TAG_KEY, convertEnumToKey(card.language)),
  ])
}

const retrieveBySetNumber = (series:string, set:string, numberInSet:string, variant:CardVariant, language:CardLanguage):Promise<ItemEntity> => {
  return retrieveByUniqueCard({series, set, numberInSet, variant, language})
}

const retrieveByPokemonTcgId = (pokemonTcgCardId:string):Promise<Array<ItemEntity>> => {
  return itemRepository.getMany({
    itemType: SINGLE_POKEMON_CARD_ITEM_TYPE,
    'metadata.externalIdentifiers.POKEMON_TCG_API.id': pokemonTcgCardId,
  })
}

// const retrieveByEbaySourceTimeAsc = (limit:number):Promise<Array<ItemEntity>> => {
//
// }
//
// const retrieveByEbayOpenListingSourceTimeAsc = (limit:number):Promise<Array<ItemEntity>> => {
//
// }
//
// const retrieveByStatCalculationTimeAsc = (limit:number):Promise<Array<ItemEntity>> => {
//
// }
//
// const retrieveAll = ():Promise<Array<ItemEntity>> => {
//
// }

const retrieveByIds = async (ids:Array<string>):Promise<Array<ItemEntity>> => {
  return itemRepository.getManyByMaybeLegacyIds(ids)
}

// const retrieveVisibleByTags = async (tags:Array<string>, limit:number, fromId?:string):Promise<Array<ItemEntity>> => {
//
// }

const retrieveVisibleByIds = async (ids:Array<string>):Promise<Array<ItemEntity>> => {
  const items = await retrieveByIds(ids)
  return items.filter(item => item.visible)
}

const retrieveReverseHoloForCard = async (cardId:string):Promise<ItemEntity|null> => {
  const item = await retrieve(cardId)
  if (item.itemType !== SINGLE_POKEMON_CARD_ITEM_TYPE || !item.itemDetails) {
    return null;
  }
  const itemDetails = item.itemDetails as SingleCardItemDetails;
  if (itemDetails.variant === CardVariant.REVERSE_HOLO) {
    return item;
  }
  return retrieveOptionalByUniqueCard({
    series: itemDetails.series,
    set: itemDetails.set,
    numberInSet: itemDetails.cardNumber,
    variant: CardVariant.REVERSE_HOLO,
    language: languageOrFallback(itemDetails.language),
  })
}

export const cardItemRetriever = {
  retrieve,
  retrieveOptional,
  retrieveBySlug,
  retrieveOptionalBySlug,
  retrieveBySetNumber,
  retrieveByUniqueCard,
  retrieveBySetAndNumberAndVariant,
  retrieveBySeriesAndSetAndVariant,
  retrieveOptionalByUniqueCard,
  retrieveBySet,
  retrieveBySetId,
  retrieveByUniqueSet,
  retrieveByPokemonTcgId,
  retrieveByIds,
  retrieveVisibleByIds,
  retrieveReverseHoloForCard,
}