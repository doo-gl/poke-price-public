import {CardSort, SortDirection} from "../../card/PublicCardDtoRetrieverV3";
import {SearchTag, SearchTagType} from "../../search-tag/SearchTagEntity";
import {PagingMetadata, PagingResults} from "../../PagingResults";
import {BasicItemDto, ItemDtoV2} from "./ItemDtoV2";
import {AutocompleteResponse} from "../../search-tag/AutocompleteSearchTagRetriever";
import {publicSearchTagRetriever} from "../../search-tag/PublicSearchTagRetriever";
import {itemRetriever} from "../ItemRetriever";
import {itemMapperV2} from "./ItemMapperV2";
import {searchTagDtoRetriever} from "../../search-tag/SearchTagDtoRetriever";
import {Filter, FindOptions, SortDirection as MongoSortDirection} from "mongodb";
import {ItemEntity, itemRepository, RelatedItem, RelatedItems} from "../ItemEntity";
import {itemIdOrSlugRetriever} from "../ItemIdOrSlugRetriever";
import {NotFoundError} from "../../../error/NotFoundError";
import {requestToDatabaseQueryMapper} from "./RequestToDatabaseQueryMapper";

export enum ItemSort {
  VALUE = 'VALUE',
  SALES = 'SALES',
  NAME = 'NAME',
}

export interface PublicItemRequestV2 {
  tags?:Array<string>,
  sort?:ItemSort,
  sortDirection?:SortDirection,
  pageIndex?:number,
  pageSize?:number,
}

export interface PublicItemResponseV2 {
  request: {
    tags?:Array<SearchTag>,
    sort?:ItemSort,
    sortDirection?:SortDirection,
    pageIndex?:number,
    pageSize?:number,
  }
  paging:PagingMetadata,
  results:Array<ItemDtoV2>
}

export interface PublicBasicItemResponseV2 {
  request: {
    tags?:Array<SearchTag>,
    sort?:ItemSort,
    sortDirection?:SortDirection,
    pageIndex?:number,
    pageSize?:number,
  }
  paging:PagingMetadata,
  results:Array<BasicItemDto>
}

export interface RelatedItemResponse {
  itemId:string,
  previousItem:RelatedItem|null,
  nextItem:RelatedItem|null,
  relatedItems:RelatedItems,
}

const retrieveItemsFromDatabase = async (request:PublicItemRequestV2):Promise<PagingResults<ItemEntity>> => {

  const query = requestToDatabaseQueryMapper.map(request)
  // const getQuery = async () => {
  //   const start = new Date()
  //   const res = await itemRepository.getMany(filter, findOptions)
  //   const end = new Date()
  //   const millisTaken = end.getTime() - start.getTime()
  //   const message = `Get item documents took ${millisTaken}ms`
  //   if (millisTaken > 10000) {
  //     logger.error(message, filter)
  //   } else {
  //     logger.info(message, filter)
  //   }
  //   return res;
  // }
  // const countQuery = async () => {
  //   const start = new Date()
  //   const res = await itemRepository.count(filter)
  //   const end = new Date()
  //   const millisTaken = end.getTime() - start.getTime()
  //   const message = `Get item count took ${millisTaken}ms`
  //   if (millisTaken > 10000) {
  //     logger.error(message, filter)
  //   } else {
  //     logger.info(message, filter)
  //   }
  //   return res
  // }

  const results = await Promise.all([
    itemRepository.getMany(query.filter, query.findOptions),
    // itemRepository.count(filter),
  ]);
  const items = results[0];
  const count = 0;
  // const count = results[1];
  return {
    results: items,
    paging: {
      pageIndex: query.pageIndex,
      pageSize: query.limit,
      count,
    },
  }
}

const retrieve = async (request:PublicItemRequestV2):Promise<PublicItemResponseV2> => {
  const results = await Promise.all([
    retrieveItemsFromDatabase(request),
    searchTagDtoRetriever.retrieveTags(SearchTagType.ITEM, request.tags),
  ]);
  const items = results[0];
  const tags = results[1];
  return {
    request: {
      ...request,
      tags,
    },
    paging: items.paging,
    results: itemMapperV2.mapList(items.results),
  }
}

const retrieveByIdOrSlug = async (itemIdOrSlug:string):Promise<ItemDtoV2> => {
  const item = await itemIdOrSlugRetriever.retrieve(itemIdOrSlug)
  const dto = itemMapperV2.map(item)
  if (!dto) {
    throw new NotFoundError(`Failed to find item for id: ${itemIdOrSlug}`)
  }
  return dto;
}

const retrieveByIds = async (itemIds:Array<string>):Promise<Array<ItemDtoV2>> => {
  const items = await itemRetriever.retrieveManyByIdOrLegacyId(itemIds);
  return itemMapperV2.mapList(items)
}

const retrieveSearchTags = async (query?:string):Promise<AutocompleteResponse<SearchTag>> => {
  if (!query) {
    return {
      query: '',
      results: [],
    }
  }
  const results = await publicSearchTagRetriever.retrieveTags({searchTagType: SearchTagType.ITEM, query, tags: null, keys: null})
  return { results, query }
}

const retrieveRelatedItemsForItem = async (itemIdOrSlug:string):Promise<RelatedItemResponse> => {
  const item = await itemIdOrSlugRetriever.retrieve(itemIdOrSlug)
  return {
    itemId: item._id.toString(),
    relatedItems: item.relatedItems,
    nextItem: item.nextItem,
    previousItem: item.previousItem,
  }
}

export const publicItemRetrieverV2 = {
  retrieve,
  retrieveByIds,
  retrieveSearchTags,
  retrieveByIdOrSlug,
  retrieveRelatedItemsForItem,
}
