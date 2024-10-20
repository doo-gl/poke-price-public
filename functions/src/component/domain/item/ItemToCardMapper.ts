import {ItemEntity, SingleCardItemDetails} from "./ItemEntity";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../marketplace/item-details/SinglePokemonCardItemDetails";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";


const mapOptional = (item:ItemEntity|null):SingleCardItemDetails|null => {
  if (!item) {
    return null;
  }
  if (item.itemType !== SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return null;
  }
  return item.itemDetails as SingleCardItemDetails
}

const map = (item:ItemEntity):SingleCardItemDetails => {
  const details = mapOptional(item)
  if (!details) {
    throw new InvalidArgumentError(`Item with id: ${item._id} is not a card type item`)
  }
  return details;
}

export const itemToCardMapper = {
  mapOptional,
  map,
}