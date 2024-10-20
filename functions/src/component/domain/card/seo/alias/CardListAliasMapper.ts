import {EntityDto} from "../../../EntityDto";
import {CardListAliasEntity} from "./CardListAliasEntity";
import {entityDtoMapper} from "../../../EntityDtoMapper";


export interface CardListAliasDto extends EntityDto {
  canonicalSlug:string
  aliasSlug:string,
  title:string|null,
  description:string|null,
  imageUrls:Array<string>|null,
}

export interface PublicCardListAliasDto {
  id:string,
  canonicalSlug:string
  aliasSlug:string,
  title:string|null,
  description:string|null,
  imageUrls:Array<string>|null,
}

const map = (cardListAlias:CardListAliasEntity):CardListAliasDto => {
  return {
    ...entityDtoMapper.map(cardListAlias),
    aliasSlug: cardListAlias.aliasSlug,
    canonicalSlug: cardListAlias.canonicalSlug,
    title: cardListAlias.title,
    description: cardListAlias.description,
    imageUrls: cardListAlias.imageUrls,
  }
}

const mapPublic = (cardListAlias:CardListAliasEntity):PublicCardListAliasDto => {
  return {
    id: cardListAlias.id,
    aliasSlug: cardListAlias.aliasSlug,
    canonicalSlug: cardListAlias.canonicalSlug,
    title: cardListAlias.title,
    description: cardListAlias.description,
    imageUrls: cardListAlias.imageUrls,
  }
}

export const cardListAliasMapper = {
  map,
  mapPublic,
}