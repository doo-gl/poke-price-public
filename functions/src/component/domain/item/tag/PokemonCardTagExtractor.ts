import {CardLanguage, SingleCardItemDetails} from "../ItemEntity";
import {SearchTag} from "../../search-tag/SearchTagEntity";
import {capitaliseKey, capitalizeEnum, convertEnumToKey, convertToKey} from "../../../tools/KeyConverter";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../../marketplace/item-details/SinglePokemonCardItemDetails";
import {ITEM_TYPE_SEARCH_TAG_KEY} from "./ItemTagExtractor";
import capitalize from "capitalize";

export const CARD_SERIES_SEARCH_TAG_KEY = 'card-series';
export const CARD_SET_SEARCH_TAG_KEY = 'card-set';
export const CARD_NUMBER_SEARCH_TAG_KEY = 'card-number';
export const CARD_SET_NUMBER_SEARCH_TAG_KEY = 'card-set-number';
export const CARD_CODE_SEARCH_TAG_KEY = 'card-code';
export const CARD_SET_ID_SEARCH_TAG_KEY = 'card-set-id';
export const CARD_ARTIST_SEARCH_TAG_KEY = 'card-artist';
export const CARD_RARITY_SEARCH_TAG_KEY = 'card-rarity';
export const CARD_SUPER_TYPE_SEARCH_TAG_KEY = 'card-super-type';
export const CARD_VARIANT_SEARCH_TAG_KEY = 'card-variant';
export const POKEMON_SEARCH_TAG_KEY = 'pokemon';
export const LANGUAGE_SEARCH_TAG_KEY = 'language';
export const CARD_ENERGY_TYPE_SEARCH_TAG_KEY = 'card-energy-type';
export const CARD_SUB_TYPE_SEARCH_TAG_KEY = 'card-sub-type';

export const extractCardNumber = (itemDetails:SingleCardItemDetails) => {
  const hasSetNumber = itemDetails.setNumber && itemDetails.setNumber.length > 0;
  const startsWithLetter = itemDetails.cardNumber.match(/^[a-zA-Z]+/gim)
  const code = hasSetNumber && !startsWithLetter
    ? `${itemDetails.cardNumber.toUpperCase()} / ${itemDetails.setNumber.toUpperCase()}`
    : itemDetails.cardNumber.toUpperCase();
  return code
}

const extract = (itemDetails:SingleCardItemDetails):Array<SearchTag> => {
  const searchTags:Array<SearchTag> = [];
  // non public tags
  searchTags.push({ key: CARD_SET_ID_SEARCH_TAG_KEY, value: itemDetails.setId, keyLabel: 'Card set id', valueLabel: itemDetails.setId, public: false })

  // publicly visible tags
  searchTags.push({ key: ITEM_TYPE_SEARCH_TAG_KEY, value: SINGLE_POKEMON_CARD_ITEM_TYPE, keyLabel: 'Item Type', valueLabel: capitaliseKey(SINGLE_POKEMON_CARD_ITEM_TYPE), public: true })
  searchTags.push({ key: CARD_SERIES_SEARCH_TAG_KEY, value: itemDetails.series, keyLabel: 'Series', valueLabel: capitaliseKey(itemDetails.series), public: true })
  searchTags.push({ key: CARD_SET_SEARCH_TAG_KEY, value: itemDetails.set, keyLabel: 'Set', valueLabel: capitaliseKey(itemDetails.set), public: true })
  searchTags.push({ key: CARD_NUMBER_SEARCH_TAG_KEY, value: itemDetails.cardNumber.toLowerCase(), keyLabel: 'Card Number', valueLabel: itemDetails.cardNumber.toLowerCase(), public: true })
  searchTags.push({ key: CARD_SET_NUMBER_SEARCH_TAG_KEY, value: itemDetails.setNumber.toLowerCase(), keyLabel: 'Card Set Number', valueLabel: itemDetails.setNumber.toLowerCase(), public: true })
  const cardCode = extractCardNumber(itemDetails).replace(/ /gim, '')
  searchTags.push({ key: CARD_CODE_SEARCH_TAG_KEY, value: cardCode.toLowerCase().replace(/\//gim, '-'), keyLabel: 'Card Code', valueLabel: cardCode, public: true })
  if (itemDetails.rarity) {
    searchTags.push({ key: CARD_RARITY_SEARCH_TAG_KEY, value: itemDetails.rarity, keyLabel: 'Card Rarity', valueLabel: capitaliseKey(itemDetails.rarity), public: true })
  }
  if (itemDetails.artist) {
    searchTags.push({ key: CARD_ARTIST_SEARCH_TAG_KEY, value: convertToKey(itemDetails.artist), keyLabel: 'Card Artist', valueLabel: itemDetails.artist, public: true })
  }
  searchTags.push({ key: CARD_SUPER_TYPE_SEARCH_TAG_KEY, value: itemDetails.superType, keyLabel: 'Card Super Type', valueLabel: capitaliseKey(itemDetails.superType), public: true })
  searchTags.push({ key: CARD_VARIANT_SEARCH_TAG_KEY, value: convertEnumToKey(itemDetails.variant), keyLabel: 'Card Variant', valueLabel: capitalizeEnum(itemDetails.variant), public: true })

  const languageKey = itemDetails.language === undefined ? convertEnumToKey(CardLanguage.ENGLISH) : convertEnumToKey(itemDetails.language)
  const languageLabel = itemDetails.language === undefined ? "English" : capitalizeEnum(itemDetails.language)
  searchTags.push({ key: LANGUAGE_SEARCH_TAG_KEY, value: languageKey, keyLabel: 'Language', valueLabel: languageLabel, public: true })
  itemDetails.pokemon.forEach(pokemon => {
    const pokemonLabel = capitalize(pokemon)
    searchTags.push({ key: POKEMON_SEARCH_TAG_KEY, value: convertToKey(pokemon), keyLabel: 'Pokemon', valueLabel: pokemonLabel, public: true })
  })
  itemDetails.energyTypes.forEach(energyType => {
    searchTags.push({ key: CARD_ENERGY_TYPE_SEARCH_TAG_KEY, value: convertToKey(energyType), keyLabel: 'Card Energy Type', valueLabel: capitaliseKey(energyType), public: true })
  })
  itemDetails.subTypes.forEach(subType => {
    searchTags.push({ key: CARD_SUB_TYPE_SEARCH_TAG_KEY, value: convertToKey(subType), keyLabel: 'Card Sub Type', valueLabel: capitaliseKey(subType), public: true })
  })

  return searchTags;
}

export const pokemonCardTagExtractor = {
  extract,
}