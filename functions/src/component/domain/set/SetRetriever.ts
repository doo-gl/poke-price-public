import {NotFoundError} from "../../error/NotFoundError";
import {SetEntity} from "./SetEntity";
import {setRepository} from "./SetRepository";
import {singleResultRepoQuerier} from "../../database/SingleResultRepoQuerier";
import {UniqueSet} from "./UniqueSet";
import {Cache, cacheBuilder} from "../../database/cache/Cache";
import {pokemonTcgApiClientV2} from "../../client/PokemonTcgApiClientV2";
import {CardDataSource} from "../card/CardDataSource";


const retrieve = (id:string):Promise<SetEntity> => {
  return setRepository.getOne(id)
    .then(result => {
      if (!result) {
        throw new NotFoundError(`Failed to find set with id: ${id}`);
      }
      return result;
    })
}

const retrieveByIds = (ids:Array<string>):Promise<Array<SetEntity>> => {
  return setRepository.getManyById(ids)
}

const retrieveOptionalSet = async (setIdentifier:UniqueSet):Promise<SetEntity|null> => {
  return singleResultRepoQuerier.query(
    setRepository,
    [
      { name: "series", value: setIdentifier.series },
      { name: "name", value: setIdentifier.set },
    ],
    'set'
  );
}

const retrieveSet = async (setIdentifier:UniqueSet):Promise<SetEntity> => {
  return singleResultRepoQuerier.queryOrThrow(
    setRepository,
    [
      { name: "series", value: setIdentifier.series },
      { name: "name", value: setIdentifier.set },
    ],
    'set'
  );
}

const retrieveMany = (setIds:Array<string>):Promise<Array<SetEntity>> => {
  return setRepository.getManyById(setIds)
}

const retrieveSetByPokemonTcgApiId = async (pokemonTcgApiSetId:string):Promise<SetEntity|null> => {
  return singleResultRepoQuerier.query(
    setRepository,
    [
      { name: `externalIdentifiers.${CardDataSource.POKEMON_TCG_API}.code`, value: pokemonTcgApiSetId },
    ],
    'set'
  );
}


type AllSetQuery = { query:'ALL' }
const ALL_SETS_CACHE = cacheBuilder<AllSetQuery,Array<SetEntity>>()
  .entryLifetimeInMinutes(60 * 24) // one day
  .build(() => setRepository.getMany([]))

const retrieveAll = async ():Promise<Array<SetEntity>> => {
  return ALL_SETS_CACHE.get(`SET`, {query: 'ALL'});
}

export const setRetriever = {
  retrieve,
  retrieveByIds,
  retrieveSet,
  retrieveMany,
  retrieveOptionalSet,
  retrieveAll,
  retrieveSetByPokemonTcgApiId,
}