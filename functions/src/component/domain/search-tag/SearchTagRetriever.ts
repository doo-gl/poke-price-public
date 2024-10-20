import {SearchTagEntity, searchTagRepository, SearchTagType} from "./SearchTagEntity";


const retrieveByTags = (searchTagType:SearchTagType, tags:Array<string>):Promise<Array<SearchTagEntity>> => {
  return searchTagRepository.getMany({
    type: searchTagType,
    tag: { $in: tags },
  })
}

const retrieveByTagKeys = async (searchTagType:SearchTagType, keys:Array<string>):Promise<Array<SearchTagEntity>> => {

  return searchTagRepository.getMany({
    type: searchTagType,
    key: { $in: keys },
  })
}

export const searchTagRetriever = {
  retrieveByTags,
  retrieveByTagKeys,
}