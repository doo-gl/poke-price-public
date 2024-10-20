import {cardListAliasMapper, PublicCardListAliasDto} from "./CardListAliasMapper";
import {singleResultRepoQuerier} from "../../../../database/SingleResultRepoQuerier";
import {cardListAliasRepository} from "./CardListAliasEntity";


const retrieveForAliasSlug = async (aliasSlug:string):Promise<PublicCardListAliasDto|null> => {
  const alias = await singleResultRepoQuerier.query(
    cardListAliasRepository,
    [{name: "aliasSlug", value: aliasSlug}],
    cardListAliasRepository.collectionName
  )
  if (!alias) {
    return null
  }
  return cardListAliasMapper.mapPublic(alias);
}

export const publicCardListAliasRetriever = {
  retrieveForAliasSlug,
}