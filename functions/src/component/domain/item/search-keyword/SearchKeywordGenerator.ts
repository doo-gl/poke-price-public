import {ItemEntity} from "../ItemEntity";
import {Create} from "../../../database/mongo/MongoEntity";
import {SearchKeywords} from "../../card/CardEntity";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../../marketplace/item-details/SinglePokemonCardItemDetails";
import {pokemonCardKeywordGenerator} from "./PokemonCardKeywordGenerator";


const generate = (create:Create<ItemEntity>|ItemEntity):SearchKeywords => {
  if (create.itemType === SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return pokemonCardKeywordGenerator.generate(create)
  }
  return create.searchKeywords
}

export const searchKeywordGenerator = {
  generate,
}