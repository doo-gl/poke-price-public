import {Entity} from "../../../database/Entity";
import {Timestamp} from "../../../external-lib/Firebase";
import {PokemonTcgCardMarketPriceInfo, PokemonTcgPlayerPriceInfo} from "../../../client/PokemonTcgApiClientV2";
import {repositoryFactory} from "../../../database/RepositoryFactory";

const COLLECTION_NAME = 'pokemon-tcg-api-price-history'

export interface PokemonTcgApiPriceHistoryEntity extends Entity {
  itemId:string,
  pokemonTcgApiId:string,
  pokemonTcgApiUrl:string,
  timestamp:Timestamp,
  tcgPlayer:PokemonTcgPlayerPriceInfo|null,
  cardMarket:PokemonTcgCardMarketPriceInfo|null,
}

const result = repositoryFactory.build<PokemonTcgApiPriceHistoryEntity>(COLLECTION_NAME);
export const pokemonTcgApiPriceHistoryRepository = result.repository;
export const pokemonTcgApiPriceHistoryCreator = result.creator;
export const pokemonTcgApiPriceHistoryUpdater = result.updater;
export const pokemonTcgApiPriceHistoryDeleter = result.deleter;