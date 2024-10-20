import {SearchTagEntity, searchTagRepository, SearchTagType} from "./SearchTagEntity";
import {dedupeInOrder} from "../../tools/ArrayDeduper";

export interface AutocompleteResponse<T> {
  query:string,
  results:Array<T>
}

const retrieveSearchResultsV2 = async (searchTagType:SearchTagType, query:string):Promise<Array<SearchTagEntity>> => {
  const limit = 20;
  const pipeline = [
    {
      $search: {
        index: "idx_search__search_tags__type__public__autocomplete_key__autocomplete_value",
        compound: {
          filter: [
            { text: { path: "type", query: searchTagType } },
            { equals: { path: "public", value: true } },
          ],
          should: [
            { autocomplete: { path: "key", query } },
            { autocomplete: { path: "value", query } },
          ],
          minimumShouldMatch: 1,
        },
      },
    },
    {
      $limit: limit,
    },
  ]
  const results = await searchTagRepository.aggregate(pipeline)
  return results as SearchTagEntity[]
}

const retrieveExactResults = async (searchTagType:SearchTagType, query:string):Promise<Array<SearchTagEntity>> => {
  const results = await searchTagRepository.getMany(
    {
      type: searchTagType,
      value: query,
    },
    {
      limit: 20,
    }
  )
  return results
}

const retrieve = async (searchTagType:SearchTagType, query:string):Promise<Array<SearchTagEntity>> => {

  const results = await Promise.all([
    retrieveExactResults(searchTagType, query),
    retrieveSearchResultsV2(searchTagType, query),
  ])
  const allResults = results[0].concat(results[1])
  const dedupedResults = dedupeInOrder(allResults, tag => tag.tag);
  return dedupedResults
}

export const autocompleteSearchTagRetriever = {
  retrieve,
}