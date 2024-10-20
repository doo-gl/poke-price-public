import {PublicCardDto} from "./PublicCardDto";
import {cacheBuilder} from "../../database/cache/Cache";
import {cardDtoMapper} from "./CardDtoMapper";
import {cardIdOrSlugRetriever} from "./CardIdOrSlugRetriever";
import {NotFoundError} from "../../error/NotFoundError";

const CACHE_ENTRY_TYPE = 'PUBLIC_CARD_DTO'

const retrieve = async (cardIdOrSlug:string):Promise<PublicCardDto> => {
  const card = await cardIdOrSlugRetriever.retrieve(cardIdOrSlug);
  const dto = cardDtoMapper.mapPublic(card)
  if (!dto) {
    throw new NotFoundError(`Failed to find card for ${cardIdOrSlug}`)
  }
  return dto;
}

type CardIdQuery = { cardIdOrSlug:string }
const GET_BY_CARD_ID_CACHE = cacheBuilder<CardIdQuery, PublicCardDto>()
  .entryLifetimeInMinutes(60)
  .build(query => retrieve(query.cardIdOrSlug));

const retrieveCached = (cardIdOrSlug:string):Promise<PublicCardDto> => {
  return GET_BY_CARD_ID_CACHE.get(CACHE_ENTRY_TYPE, { cardIdOrSlug });
}

export const publicCardDtoRetriever = {
  retrieve,
  retrieveCached,
}