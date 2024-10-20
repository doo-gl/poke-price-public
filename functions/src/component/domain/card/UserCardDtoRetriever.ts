import {UserCardDto} from "./PublicCardDto";
import {cardDtoMapper} from "./CardDtoMapper";
import {cacheBuilder} from "../../database/cache/Cache";
import {cardIdOrSlugRetriever} from "./CardIdOrSlugRetriever";
import {NotFoundError} from "../../error/NotFoundError";

const CACHE_ENTRY_TYPE = 'USER_CARD_DTO'

const retrieve = async (cardIdOrSlug:string):Promise<UserCardDto> => {
  const card = await cardIdOrSlugRetriever.retrieve(cardIdOrSlug);
  const dto = cardDtoMapper.mapUser(card)
  if (!dto) {
    throw new NotFoundError(`Failed dto find card for ${cardIdOrSlug}`)
  }
  return dto;
}

type CardIdQuery = { cardIdOrSlug:string }
const GET_BY_CARD_ID_CACHE = cacheBuilder<CardIdQuery, UserCardDto>()
  .entryLifetimeInMinutes(60)
  .build(query => retrieve(query.cardIdOrSlug));

const retrieveCached = (cardIdOrSlug:string):Promise<UserCardDto> => {
  return GET_BY_CARD_ID_CACHE.get(CACHE_ENTRY_TYPE, { cardIdOrSlug });
}

export const userCardDtoRetriever = {
  retrieve,
  retrieveCached,
}