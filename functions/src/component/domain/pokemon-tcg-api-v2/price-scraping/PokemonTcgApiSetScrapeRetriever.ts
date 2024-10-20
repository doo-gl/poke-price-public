import {PokemonTcgApiSetScrapeEntity, pokemonTcgApiSetScrapeRepository} from "./PokemonTcgApiSetScrapeEntity";
import {singleResultRepoQuerier} from "../../../database/SingleResultRepoQuerier";
import {SortOrder} from "../../../database/BaseCrudRepository";


const retrieveOptionalBySetId = async (setId:string):Promise<PokemonTcgApiSetScrapeEntity|null> => {
  return singleResultRepoQuerier.query(
    pokemonTcgApiSetScrapeRepository,
    [{name: "setId", value: setId}],
    pokemonTcgApiSetScrapeRepository.collectionName
  )
}

const retrieveByLastAttemptAsc = async (limit:number, startAfterId?:string):Promise<Array<PokemonTcgApiSetScrapeEntity>> => {
  return pokemonTcgApiSetScrapeRepository.getMany(
    [],
    {
      limit,
      sort: [{field: "lastScrapeAttempt", order: SortOrder.ASC}],
      startAfterId,
    }
  )
}

export const pokemonTcgApiSetScrapeRetriever = {
  retrieveOptionalBySetId,
  retrieveByLastAttemptAsc,
}