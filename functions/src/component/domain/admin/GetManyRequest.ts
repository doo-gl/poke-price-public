import {Query as QueryV1} from "../../database/BaseCrudRepository";


export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export interface GetManyRequest<T> {
  startAfterId:string|null,
  endAtId:string|null,
  pageSize:number,
  sortField:Extract<keyof T, string>|string|null,
  sortDirection:SortDirection,
  ids:Array<string>|null,
  queries:Array<QueryV1<T>>
}

export type QueryOperation = 'eq'|'gt'|'lt'|'ge'|'le'
export interface Query<T> {
  field:Extract<keyof T, string>|string,
  operation:QueryOperation,
  value:any,
}

export interface GetManyRequestV2<T> {
  pageIndex:number|null,
  pageSize:number,
  sortField:Extract<keyof T, string>|string|null,
  sortDirection:SortDirection,
  ids:Array<string>|null,
  queries:Array<Query<T>>
}