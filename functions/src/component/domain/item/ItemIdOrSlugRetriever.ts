// https://stackoverflow.com/questions/136505/searching-for-uuids-in-text-with-regex
import {ItemEntity} from "../item/ItemEntity";
import {itemRetriever} from "./ItemRetriever";

const UUID_V4_PATTERN = /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i

const isId = (idOrSlug:string):boolean => {
  return !!new RegExp(UUID_V4_PATTERN).exec(idOrSlug)
}

const retrieve = async (itemIdOrSlug:string):Promise<ItemEntity> => {

  if (isId(itemIdOrSlug)) {
    const itemById = await itemRetriever.retrieveOptionalByIdOrLegacyId(itemIdOrSlug);
    if (itemById) {
      return itemById;
    }
    return await itemRetriever.retrieveBySlug(itemIdOrSlug)
  }

  const itemBySlug = await itemRetriever.retrieveOptionalBySlug(itemIdOrSlug);
  if (itemBySlug) {
    return itemBySlug;
  }
  return await itemRetriever.retrieveByIdOrLegacyId(itemIdOrSlug)
}

export const itemIdOrSlugRetriever = {
  retrieve,
  isId,
}