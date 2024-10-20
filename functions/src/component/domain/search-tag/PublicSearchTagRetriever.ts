import {SearchTag, SearchTagEntity, SearchTagType, toSearchTag} from "./SearchTagEntity";
import {searchTagRetriever} from "./SearchTagRetriever";
import {autocompleteSearchTagRetriever} from "./AutocompleteSearchTagRetriever";

export interface SearchTagRequest {
  searchTagType:SearchTagType,
  tags:Array<string>|null,
  keys:Array<string>|null,
  query:string|null
}

const retrieveEntities = async (request:SearchTagRequest):Promise<Array<SearchTagEntity>> => {
  if (request.query && request.query.length > 0) {
    return autocompleteSearchTagRetriever.retrieve(request.searchTagType, request.query)
  }
  if (request.tags && request.tags.filter(tag => tag.length > 0).length > 0) {
    return searchTagRetriever.retrieveByTags(request.searchTagType, request.tags)
  }
  if (request.keys) {
    return searchTagRetriever.retrieveByTagKeys(request.searchTagType, request.keys)
  }
  return []
}

const retrieveTags = async (request:SearchTagRequest):Promise<Array<SearchTag>> => {

  const searchTags = await retrieveEntities(request)
  return searchTags
    .filter(searchTag => searchTag.public)
    .map(toSearchTag)
}

export const publicSearchTagRetriever = {
  retrieveTags,
}