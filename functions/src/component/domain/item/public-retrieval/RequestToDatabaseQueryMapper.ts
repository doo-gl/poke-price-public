import {Filter, FindOptions, SortDirection as MongoSortDirection} from "mongodb";
import {ItemEntity} from "../ItemEntity";
import {ItemSort, PublicItemRequestV2} from "./PublicItemRetrieverV2";
import {CardSort, SortDirection} from "../../card/PublicCardDtoRetrieverV3";

export interface MongoItemQuery {
  filter:Filter<ItemEntity>,
  findOptions:FindOptions,
  pageIndex:number,
  limit:number,
}

const mapSort = (sort:ItemSort, dir:SortDirection):[string,MongoSortDirection] => {
  switch (sort) {
    case ItemSort.VALUE:
      return ['sort.ukPrice', dir === SortDirection.ASC ? 1 : -1];
    case ItemSort.SALES:
      return ['sort.ukSales', dir === SortDirection.ASC ? 1 : -1];
    case ItemSort.NAME:
      return ['name', dir === SortDirection.ASC ? 1 : -1];
    default:
      return ['sort.ukPrice', dir === SortDirection.ASC ? 1 : -1];
  }
}

const map = (request:PublicItemRequestV2):MongoItemQuery => {
  const requestCopy = Object.assign({}, request)

  const limit = requestCopy.pageSize && requestCopy.pageSize <= 50
    ? requestCopy.pageSize
    : 50;
  const pageIndex = requestCopy.pageIndex ?? 0;
  const sort = requestCopy.sort ?? CardSort.VALUE;
  const sortDirection = requestCopy.sortDirection ?? SortDirection.DESC;
  const filter:Filter<ItemEntity> = {};
  if (requestCopy.tags && requestCopy.tags.length > 0) {
    filter.tags = {$all: requestCopy.tags}
  }
  if (requestCopy.sort === ItemSort.VALUE) {
    // @ts-ignore
    filter['sort.ukPrice'] = {$ne: null}
  } else if (requestCopy.sort === ItemSort.SALES) {
    // @ts-ignore
    filter['sort.ukSales'] = {$ne: null}
  }
  const findOptions:FindOptions = {
    limit,
    skip: pageIndex * limit,
  }
  // @ts-ignore
  findOptions.sort = [mapSort(sort, sortDirection)]

  return {filter, findOptions, pageIndex, limit}
}

export const requestToDatabaseQueryMapper = {
  map,
}