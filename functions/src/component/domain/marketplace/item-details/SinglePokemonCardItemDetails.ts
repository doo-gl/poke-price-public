import {CardCondition} from "../../historical-card-price/CardCondition";
import {ItemDetailMapper, ItemDetails} from "../MarketplaceListingEntity";
import {itemDetailMapperFactory} from "./ItemDetailMapperFactory";


export type SinglePokemonCardItemType = "single-pokemon-card"
export const SINGLE_POKEMON_CARD_ITEM_TYPE:SinglePokemonCardItemType = "single-pokemon-card";
export interface SinglePokemonCardItemDetails extends ItemDetails {
  condition:CardCondition,
}
export type SinglePokemonCardItemDetailMapper = ItemDetailMapper<SinglePokemonCardItemType, SinglePokemonCardItemDetails>
export const singlePokemonCardItemDetailMapper = itemDetailMapperFactory.build<SinglePokemonCardItemType, SinglePokemonCardItemDetails>(SINGLE_POKEMON_CARD_ITEM_TYPE);