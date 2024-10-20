import {PagingMetadata, PagingResults} from "../PagingResults";
import {marketplaceListingMapper, PublicMarketplaceListing} from "./MarketplaceListingMapper";
import {MarketplaceListingEntity, marketplaceListingRepository} from "./MarketplaceListingEntity";
import {Filter, FindOptions, SortDirection as MongoSortDirection} from "mongodb";
import {userContext} from "../../infrastructure/UserContext";
import {AutocompleteResponse} from "../search-tag/AutocompleteSearchTagRetriever";
import {keyValueToTag, SearchTag, SearchTagType} from "../search-tag/SearchTagEntity";
import {searchTagDtoRetriever} from "../search-tag/SearchTagDtoRetriever";
import {publicSearchTagRetriever} from "../search-tag/PublicSearchTagRetriever";
import {toInputValueSet} from "../../tools/SetBuilder";
import {CURRENCY_CODE_SEARCH_TAG_KEY, PROFITABILITY_SEARCH_TAG_KEY} from "./EbayListingTagExtractor";
import {logger} from "firebase-functions";
import {UnexpectedError} from "../../error/UnexpectedError";
import moment from "moment";


export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC'
}

export enum MarketplaceListingSort {
  VALUE = 'VALUE',
  PROFIT = 'PROFIT',
  ENDING_AT = 'ENDING_AT',
}

export interface MarketplaceListingsRequest {
  tags?:Array<string>,
  sort?:MarketplaceListingSort,
  sortDirection?:SortDirection,
  pageIndex?:number,
  pageSize?:number,
}

export interface MarketplaceListingsResponse {
  request: {
    tags?:Array<SearchTag>,
    sort?:MarketplaceListingSort,
    sortDirection?:SortDirection,
    pageIndex?:number,
    pageSize?:number,
  }
  paging:PagingMetadata,
  results:Array<PublicMarketplaceListing>
}

const mapSort = (sort:MarketplaceListingSort, dir:SortDirection):[string ,MongoSortDirection] => {
  switch (sort) {
    case MarketplaceListingSort.ENDING_AT:
      return ['sort.endTime', dir === SortDirection.ASC ? 1 : -1];
    case MarketplaceListingSort.PROFIT:
      return ['sort.profit', dir === SortDirection.ASC ? 1 : -1];
    case MarketplaceListingSort.VALUE:
      return ['sort.price', dir === SortDirection.ASC ? 1 : -1];
    default:
      return ['sort.endTime', dir === SortDirection.ASC ? 1 : -1];
  }
}

const mapFilter = (request:MarketplaceListingsRequest):Filter<MarketplaceListingEntity> => {
  const filter:Filter<MarketplaceListingEntity> = {};
  if (request.tags && request.tags.length > 0) {
    // const tags = toInputValueSet(request.tags)
    // if (
    //   tags.size === 2
    //   && tags.has(keyValueToTag(PROFITABILITY_SEARCH_TAG_KEY, 'profitable'))
    //   && tags.has(keyValueToTag(CURRENCY_CODE_SEARCH_TAG_KEY, 'gbp'))
    //   && request.sort && request.sort === MarketplaceListingSort.ENDING_AT
    // ) {
    //   // @ts-ignore
    //   filter['popularTags.profitableAndGbp'] = true
    // } else {
    //   filter.tags = {$all: request.tags}
    // }
    filter.tags = {$all: request.tags}
  }
  if (request.sort === MarketplaceListingSort.ENDING_AT) {
    // @ts-ignore
    filter['sort.endTime'] = {$gte: new Date()}
  }
  return filter;
}

const retrieveListingsFromDatabase = async (request:MarketplaceListingsRequest):Promise<PagingResults<MarketplaceListingEntity>> => {
  const requestCopy = Object.assign({}, request)
  const limit = requestCopy.pageSize && requestCopy.pageSize <= 50
    ? requestCopy.pageSize
    : 30;
  const pageIndex = requestCopy.pageIndex ?? 0;
  const sort = requestCopy.sort ?? MarketplaceListingSort.ENDING_AT;
  const sortDirection = requestCopy.sortDirection ?? SortDirection.ASC;
  const filter:Filter<MarketplaceListingEntity> = mapFilter(requestCopy)
  const findOptions:FindOptions = {
    limit,
    skip: pageIndex * limit,
    readPreference: "secondaryPreferred",
  }
  // @ts-ignore
  findOptions.sort = [mapSort(sort, sortDirection)]

  const getQuery = async () => {
    const start = new Date()
    const res = await marketplaceListingRepository.getMany(filter, findOptions)
    const end = new Date()
    const millisTaken = end.getTime() - start.getTime()
    const message = `Get marketplace listings documents (Plain MongoDB) took ${millisTaken}ms`
    // const explain = await (await marketplaceListingRepository.getCollection()).find(filter, findOptions).explain()
    // logger.info("Explain (Plain MongoDB)", explain)
    if (millisTaken > 10000) {
      logger.error(message, filter)
    } else {
      logger.info(message, filter)
    }
    return res;
  }
  const countQuery = async () => {
    const start = new Date()
    const res = await marketplaceListingRepository.count(filter)
    const end = new Date()
    const millisTaken = end.getTime() - start.getTime()
    const message = `Get marketplace listings count took ${millisTaken}ms`
    if (millisTaken > 10000) {
      logger.error(message, filter)
    } else {
      logger.info(message, filter)
    }
    return res
  }

  const results = await Promise.all([
    getQuery(),
    // countQuery(),
  ]);
  const listings = results[0];
  // const count = results[1];
  return {
    results: listings,
    paging: {
      pageIndex,
      pageSize: limit,
      count: 0,
    },
  }
}

const mapTagPhrases = (tags?:Array<string>):Array<{phrase:{path:'tags', query:string}}> => {
  if (!tags) {
    return []
  }
  return tags.map(tag => ({phrase: { path: 'tags', query: tag }}))
}

const mapNear = (inputSort?:MarketplaceListingSort, inputDirection?:SortDirection):{near:{path:string, origin:number|Date, pivot:number, score: {boost: { value: number }}}} => {
  const sort = inputSort ?? MarketplaceListingSort.PROFIT
  const direction = inputDirection ?? SortDirection.DESC

  if (sort === MarketplaceListingSort.PROFIT) {
    const pivot = 1
    const scoreBoost = 1000000000
    const origin = direction === SortDirection.ASC ? 1 : 1000000
    return {near: { path: 'sort.profit', origin, pivot, score: {boost: {value: scoreBoost}} }}
  }
  if (sort === MarketplaceListingSort.VALUE) {
    const pivot = 1
    const scoreBoost = 1000000000
    const origin = direction === SortDirection.ASC ? 1 : 1000000
    return {near: { path: 'sort.price', origin, pivot, score: {boost: {value: scoreBoost}} }}
  }
  if (sort === MarketplaceListingSort.ENDING_AT) {
    const pivot = 2592000000 // ~30days in ms
    const scoreBoost = pivot * 2
    const origin = direction === SortDirection.ASC
      ? moment().startOf('day').toDate()
      : moment().add(3, 'month').startOf('day').toDate()
    return {near: { path: 'sort.endTime', origin, pivot, score: {boost: {value: scoreBoost}} }}
  }
  throw new UnexpectedError(`Not implemented sort: ${sort}`)
}

const mapPaging = (inputPageIndex?:number, inputPageSize?:number):{skip:number, limit:number, pageIndex:number} => {
  const pageIndex = inputPageIndex ?? 0
  const pageSize = inputPageSize ?? 30
  return {
    pageIndex,
    skip: pageIndex * pageSize,
    limit: pageSize,
  }
}

const retrieveListingsFromDatabaseV2 = async (request:MarketplaceListingsRequest):Promise<PagingResults<MarketplaceListingEntity>> => {

  const tagPhrases:any = mapTagPhrases(request.tags)
  const near:any = mapNear(request.sort, request.sortDirection)
  const paging = mapPaging(request.pageIndex, request.pageSize)

  const must = new Array<any>()
    .concat(tagPhrases)
    .concat([near])

  const pipeline:any = [
    {
      $search: {
        index: "idx_search__marketplace_listings__tags__sort",
        compound: {
          filter: [
            {range: {path: 'sort.endTime', gte: moment().toDate()}},
          ],
          must,
        },
      },
    },
    {$skip: paging.skip},
    {$limit: paging.limit},
  ]


  const getQuery = async () => {
    const start = new Date()
    const collection = await marketplaceListingRepository.getCollection()
    const res = await collection.aggregate(pipeline).toArray()
    const end = new Date()
    const millisTaken = end.getTime() - start.getTime()
    const message = `Get marketplace listings documents (Atlas Search) took ${millisTaken}ms`
    // const explain = await collection.aggregate(pipeline).explain()
    // logger.info("Explain (Atlas Search)", explain)
    if (millisTaken > 10000) {
      logger.error(message, pipeline)
    } else {
      logger.info(message, pipeline)
    }
    return res;
  }

  const results = await getQuery()

  return {
    paging: {
      pageIndex: paging.pageIndex,
      pageSize: paging.limit,
      count: 0,
    },
    results: results as MarketplaceListingEntity[],
  }
}

const retrieve = async (request:MarketplaceListingsRequest):Promise<MarketplaceListingsResponse> => {
  const user = userContext.getUser()
  const results = await Promise.all([
    retrieveListingsFromDatabase(request),
    searchTagDtoRetriever.retrieveTags(SearchTagType.MARKETPLACE_LISTING, request.tags),
  ]);
  const listings = results[0];
  const tags = results[1];
  return {
    request: {
      ...request,
      tags,
    },
    paging: listings.paging,
    results: marketplaceListingMapper.mapListingsForUser(listings.results, user),
  }
}

const retrieveV2 = async (request:MarketplaceListingsRequest):Promise<MarketplaceListingsResponse> => {
  const user = userContext.getUser()
  const results = await Promise.all([
    retrieveListingsFromDatabaseV2(request),
    searchTagDtoRetriever.retrieveTags(SearchTagType.MARKETPLACE_LISTING, request.tags),
  ]);
  const listings = results[0];
  const tags = results[1];
  return {
    request: {
      ...request,
      tags,
    },
    paging: listings.paging,
    results: marketplaceListingMapper.mapListingsForUser(listings.results, user),
  }
}

const retrieveSearchTags = async (query?:string):Promise<AutocompleteResponse<SearchTag>> => {
  if (!query) {
    return {
      query: '',
      results: [],
    }
  }
  const results = await publicSearchTagRetriever.retrieveTags({searchTagType: SearchTagType.MARKETPLACE_LISTING, query, tags: null, keys: null});
  return {results, query}
}

export const publicMarketplaceListingRetriever = {
  retrieve,
  retrieveV2,
  retrieveSearchTags,
}