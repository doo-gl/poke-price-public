import {PublicApiCardDto, publicApiCardMapper} from "./PublicApiCardMapper";
import {PagingMetadata, PagingResults} from "../PagingResults";
import {PUBLIC_API_MAX_LIMIT} from "./PublicApiWebapp";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {NotFoundError} from "../../error/NotFoundError";
import {removeNulls} from "../../tools/ArrayNullRemover";
import {ItemEntity, itemRepository} from "../item/ItemEntity";
import {Filter} from "mongodb";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../marketplace/item-details/SinglePokemonCardItemDetails";
import {keyValueToTag} from "../search-tag/SearchTagEntity";
import {
  CARD_NUMBER_SEARCH_TAG_KEY,
  CARD_SERIES_SEARCH_TAG_KEY, CARD_SET_NUMBER_SEARCH_TAG_KEY,
  CARD_SET_SEARCH_TAG_KEY, CARD_VARIANT_SEARCH_TAG_KEY,
} from "../item/tag/PokemonCardTagExtractor";
import {convertEnumToKey, convertToKey} from "../../tools/KeyConverter";
import {NAME_SEARCH_TAG_KEY} from "../item/tag/ItemTagExtractor";
import {itemRetriever} from "../item/ItemRetriever";

const getOne = async (id:string):Promise<PublicApiCardDto> => {
  const card = await itemRetriever.retrieveOptionalByIdOrLegacyIdOrSlug(id);
  if (!card) {
    throw new NotFoundError(`Card with id: ${id}, does not exist`)
  }
  const dto = publicApiCardMapper.map(card)
  if (!dto) {
    throw new NotFoundError(`Card with id: ${id}, does not exist`)
  }
  return dto
}

export interface GetManyCardRequest {
  setId?:string,
  set?:string,
  series?:string,
  cardNumber?:string,
  setNumber?:string,
  variant?:string,
  name?:string,
  pageIndex?:number,
  limit?:number,
}

const getCards = async (request:GetManyCardRequest):Promise<{cards:Array<ItemEntity>, paging:PagingMetadata}> => {

  const pageIndex = request.pageIndex ?? 0;
  const limit = request.limit
    ? Math.min(request.limit, PUBLIC_API_MAX_LIMIT)
    : PUBLIC_API_MAX_LIMIT;
  const skip = pageIndex * limit;


  if (request.setId) {
    const filter:Filter<ItemEntity> = {
      itemType: SINGLE_POKEMON_CARD_ITEM_TYPE,
      'itemDetails.setId': request.setId,
    }
    const items = await itemRepository.getMany(filter, { skip, limit })
    const count = await itemRepository.count(filter)
    return {
      cards: items.filter(card => card.visible),
      paging: { pageIndex, pageSize: limit, count },
    }
  }

  const tags:Array<string> = [];
  if (request.set !== undefined) {
    tags.push(keyValueToTag(CARD_SET_SEARCH_TAG_KEY, request.set))
  }
  if (request.series !== undefined) {
    tags.push(keyValueToTag(CARD_SERIES_SEARCH_TAG_KEY, request.series))
  }
  if (request.cardNumber !== undefined) {
    tags.push(keyValueToTag(CARD_NUMBER_SEARCH_TAG_KEY, request.cardNumber))
  }
  if (request.setNumber !== undefined) {
    tags.push(keyValueToTag(CARD_SET_NUMBER_SEARCH_TAG_KEY, request.setNumber))
  }
  if (request.variant !== undefined) {
    tags.push(keyValueToTag(CARD_VARIANT_SEARCH_TAG_KEY, convertEnumToKey(request.variant)))
  }
  if (request.name !== undefined) {
    tags.push(keyValueToTag(NAME_SEARCH_TAG_KEY, convertToKey(request.name)))
  }

  const tagFilter:Filter<ItemEntity> = {
    itemType: SINGLE_POKEMON_CARD_ITEM_TYPE,
    tags: { $all: tags },
  }
  const tagItems = await itemRepository.getMany(tagFilter, { skip, limit })
  const tagCount = await itemRepository.count(tagFilter)
  return {
    cards: tagItems.filter(card => card.visible),
    paging: { pageIndex, pageSize: limit, count: tagCount },
  }
}

const getMany = async (request:GetManyCardRequest):Promise<PagingResults<PublicApiCardDto>> => {
  const result = await getCards(request);
  const cardDtos = removeNulls(result.cards.map(card => publicApiCardMapper.map(card)))
  return {
    results: cardDtos,
    paging: result.paging,
  }
}

export const publicApiCardRetriever = {
  getOne,
  getMany,
}