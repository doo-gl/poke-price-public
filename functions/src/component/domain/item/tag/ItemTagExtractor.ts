import {Create} from "../../../database/mongo/MongoEntity";
import {SearchTag} from "../../search-tag/SearchTagEntity";
import {ItemEntity, SingleCardItemDetails} from "../ItemEntity";
import {convertToKey} from "../../../tools/KeyConverter";
import {itemValueTagExtractor} from "./ItemValueTagExtractor";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../../marketplace/item-details/SinglePokemonCardItemDetails";
import {pokemonCardTagExtractor} from "./PokemonCardTagExtractor";
import {GENERIC_ITEM_TYPE, GenericItemDetails} from "../../marketplace/item-details/GenericItemDetails";

export const NAME_SEARCH_TAG_KEY = 'name';
export const VISIBLE_SEARCH_TAG_KEY = 'visible';
export const ITEM_TYPE_SEARCH_TAG_KEY = 'item-type';

const getItemDetailTags = (itemType:string, itemDetails:any):Array<SearchTag> => {
  if (itemType === SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return pokemonCardTagExtractor.extract(itemDetails as SingleCardItemDetails)
  }
  if (itemType === GENERIC_ITEM_TYPE) {
    const genericDetails = itemDetails as GenericItemDetails;
    return genericDetails.searchTags ?? []
  }
  return []
}

const extract = (item:Create<ItemEntity>|ItemEntity):Array<SearchTag> => {
  const searchTags:Array<SearchTag> = []
  searchTags.push({ key: NAME_SEARCH_TAG_KEY, value: convertToKey(item.displayName), keyLabel: 'Name', valueLabel: item.displayName, public: true })
  searchTags.push({ key: VISIBLE_SEARCH_TAG_KEY, value: `${item.visible}`, keyLabel: 'Visible', valueLabel: `${item.visible}`, public: false })

  const valueTags = itemValueTagExtractor.extract(item.itemPrices)
  valueTags.forEach(tag => searchTags.push(tag))

  const itemDetailTags = getItemDetailTags(item.itemType, item.itemDetails);
  itemDetailTags.forEach(tag => searchTags.push(tag));

  return searchTags;
}

export const itemTagExtractor = {
  extract,
}