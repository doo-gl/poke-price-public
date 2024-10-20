import {ItemEntity, SingleCardItemDetails} from "./ItemEntity";
import {Content} from "../card/PublicCardDto";
import {genericContentMapper} from "./GenericContentMapper";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../marketplace/item-details/SinglePokemonCardItemDetails";
import {cardContentMapperV2} from "../card/CardContentMapperV2";


const map = (item:ItemEntity):Content => {
  if (item.itemType === SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return cardContentMapperV2.map(item, item.itemDetails as SingleCardItemDetails)
  }
  return genericContentMapper.map(item)
}

export const itemContentMapper = {
  map,
}