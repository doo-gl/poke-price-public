import {GenericItemType} from "../../marketplace/item-details/GenericItemDetails";
import {Identifiers} from "../ItemEntity";
import {SearchTag} from "../../search-tag/SearchTagEntity";


export interface GenericItemImportRequest {
  itemId:string|null
  name:string,
  description:string|null,
  itemType:GenericItemType,
  searchTags:Array<SearchTag>
  imageUrls:Array<string>,
  searchIncludes:Array<string>,
  searchExcludes:Array<string>,
  identifiers:Identifiers,
}

export interface BulkGenericItemImportRequest {
  requests:Array<GenericItemImportRequest>,
}