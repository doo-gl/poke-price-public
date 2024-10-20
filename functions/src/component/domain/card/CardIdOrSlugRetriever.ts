

// https://stackoverflow.com/questions/136505/searching-for-uuids-in-text-with-regex
import {ItemEntity} from "../item/ItemEntity";
import {cardItemRetriever} from "../item/CardItemRetriever";

const UUID_V4_PATTERN = /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i

const isId = (idOrSlug:string):boolean => {
  return !!new RegExp(UUID_V4_PATTERN).exec(idOrSlug)
}

const retrieve = async (cardIdOrSlug:string):Promise<ItemEntity> => {

  if (isId(cardIdOrSlug)) {
    const cardById = await cardItemRetriever.retrieveOptional(cardIdOrSlug);
    if (cardById) {
      return cardById;
    }
    return await cardItemRetriever.retrieveBySlug(cardIdOrSlug)
  }

  const cardBySlug = await cardItemRetriever.retrieveOptionalBySlug(cardIdOrSlug);
  if (cardBySlug) {
    return cardBySlug;
  }
  return await cardItemRetriever.retrieve(cardIdOrSlug)
}

export const cardIdOrSlugRetriever = {
  retrieve,
}