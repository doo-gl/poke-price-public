import {CardListAliasEntity, cardListAliasRepository} from "./CardListAliasEntity";
import {singleResultRepoQuerier} from "../../../../database/SingleResultRepoQuerier";


const retrieveByCanonicalSlug = (canonicalSlug:string):Promise<Array<CardListAliasEntity>> => {
  return cardListAliasRepository.getMany([
    {field: "canonicalSlug", operation: "==", value: canonicalSlug},
  ])
}

const retrieveByAliasSlug = (aliasSlug:string):Promise<CardListAliasEntity> => {
  return singleResultRepoQuerier.queryOrThrow(
    cardListAliasRepository,
    [{name: "aliasSlug", value: aliasSlug}],
    cardListAliasRepository.collectionName,
  )
}

const retrieveAll = ():Promise<Array<CardListAliasEntity>> => {
  return cardListAliasRepository.getMany([])
}

export const cardListAliasRetriever = {
  retrieveByCanonicalSlug,
  retrieveByAliasSlug,
  retrieveAll,
}