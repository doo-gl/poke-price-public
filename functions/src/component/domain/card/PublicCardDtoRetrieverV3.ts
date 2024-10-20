import {PagingMetadata, PagingResults} from "../PagingResults";
import {PublicCardDto} from "./PublicCardDto";
import {SearchTag, SearchTagType} from "../search-tag/SearchTagEntity";
import {AutocompleteResponse} from "../search-tag/AutocompleteSearchTagRetriever";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {cardDtoMapper} from "./CardDtoMapper";
import {ItemEntity, itemRepository} from "../item/ItemEntity";
import {Filter, FindOptions, SortDirection as MongoSortDirection} from "mongodb";
import {searchTagDtoRetriever} from "../search-tag/SearchTagDtoRetriever";
import {publicSearchTagRetriever} from "../search-tag/PublicSearchTagRetriever";
import {removeNulls} from "../../tools/ArrayNullRemover";

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC'
}

export enum CardSort {
  VALUE = 'VALUE',
  SALES = 'SALES',
  NAME = 'NAME',
}

export interface CardsRequest {
  tags?:Array<string>,
  sort?:CardSort,
  sortDirection?:SortDirection,
  pageIndex?:number,
  pageSize?:number,
}

export interface CardsResponse {
  request: {
    tags?:Array<SearchTag>,
    sort?:CardSort,
    sortDirection?:SortDirection,
    pageIndex?:number,
    pageSize?:number,
  }
  paging:PagingMetadata,
  results:Array<PublicCardDto>
}

const mapSort = (sort:CardSort, dir:SortDirection):[string ,MongoSortDirection] => {
  switch (sort) {
    case CardSort.VALUE:
      return ['sort.ukPrice', dir === SortDirection.ASC ? 1 : -1];
    case CardSort.SALES:
      return ['sort.ukSales', dir === SortDirection.ASC ? 1 : -1];
    case CardSort.NAME:
      return ['name', dir === SortDirection.ASC ? 1 : -1];
    default:
      return ['sort.ukPrice', dir === SortDirection.ASC ? 1 : -1];
  }
}

const retrieveItemsFromDatabase = async (request:CardsRequest):Promise<PagingResults<ItemEntity>> => {
  const requestCopy = Object.assign({}, request)

  const limit = requestCopy.pageSize && requestCopy.pageSize <= 50
    ? requestCopy.pageSize
    : 30;
  const pageIndex = requestCopy.pageIndex ?? 0;
  const sort = requestCopy.sort ?? CardSort.VALUE;
  const sortDirection = requestCopy.sortDirection ?? SortDirection.DESC;
  const filter:Filter<ItemEntity> = {};
  if (requestCopy.tags && requestCopy.tags.length > 0) {
    filter.tags = {$all: requestCopy.tags}
  }
  if (requestCopy.sort === CardSort.VALUE) {
    // @ts-ignore
    filter['sort.ukPrice'] = {$ne: null}
  } else if (requestCopy.sort === CardSort.SALES) {
    // @ts-ignore
    filter['sort.ukSales'] = {$ne: null}
  }
  const findOptions:FindOptions = {
    limit,
    skip: pageIndex * limit,
  }
  // @ts-ignore
  findOptions.sort = [mapSort(sort, sortDirection)]

  const results = await Promise.all([
    itemRepository.getMany(filter, findOptions),
    itemRepository.count(filter),
  ]);
  const items = results[0];
  const count = results[1];
  return {
    results: items,
    paging: {
      pageIndex,
      pageSize: limit,
      count,
    },
  }
}

const retrieveManyById = async (cardIds:Array<string>):Promise<Array<PublicCardDto>> => {
  const items = await cardItemRetriever.retrieveByIds(cardIds);
  return removeNulls(items.map(cardDtoMapper.mapPublic))
}

const retrieveMany = async (request:CardsRequest):Promise<CardsResponse> => {
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
    results: removeNulls(items.results.map(cardDtoMapper.mapPublic)),
  }
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

export const publicCardDtoRetrieverV3 = {
  retrieveMany,
  retrieveManyById,
  retrieveSearchTags,
}