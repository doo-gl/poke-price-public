import {Entity} from "../../../database/Entity";
import {Timestamp} from "../../../external-lib/Firebase";
import {PokemonTcgCardMarketPriceInfo, PokemonTcgPlayerPriceInfo} from "../../../client/PokemonTcgApiClientV2";
import {repositoryFactory} from "../../../database/RepositoryFactory";

const COLLECTION_NAME = 'pokemon-tcg-api-set-scrape'

export interface PokemonTcgApiSetScrapeEntity extends Entity {
  setId:string,
  pokemonTcgApiSetId:string,
  lastScrapeAttempt:Timestamp,
  lastSuccessfulScrapeAttempt:Timestamp,
  lastError:string|null,
}

const result = repositoryFactory.build<PokemonTcgApiSetScrapeEntity>(COLLECTION_NAME);
export const pokemonTcgApiSetScrapeRepository = result.repository;
export const pokemonTcgApiSetScrapeCreator = result.creator;
export const pokemonTcgApiSetScrapeUpdater = result.updater;
export const pokemonTcgApiSetScrapeDeleter = result.deleter;