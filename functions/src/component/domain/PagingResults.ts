
export type PagingMetadata = {
  pageIndex:number,
  pageSize:number,
  count:number,
}

export type PagingResults<T> = {
  paging:PagingMetadata,
  results:Array<T>
}

export interface ApiList<T> {
  results:Array<T>,
  fromId?:string|null,
}