import {GlobalExcludeKeywordEntity} from "./GlobalExcludeKeywordEntity";
import {singleResultRepoQuerier} from "../../../../database/SingleResultRepoQuerier";
import {globalExcludeKeywordRepository} from "./GlobalExcludeKeywordRepository";


const retrieve = ():Promise<GlobalExcludeKeywordEntity> => {
  return singleResultRepoQuerier.queryOrThrow(
    globalExcludeKeywordRepository,
    [],
    globalExcludeKeywordRepository.collectionName,
  );
}

export const globalExcludeKeywordRetriever = {
  retrieve,
}