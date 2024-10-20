import {SearchTag, toTag} from "./SearchTagEntity";


const map = (searchTags:Array<SearchTag>):Array<string> => {
  const tokens:Array<string> = []
  searchTags.forEach(searchTag => {
    if (searchTag.key) {
      tokens.push(toTag(searchTag))
    } else {
      tokens.push(searchTag.value)
    }
  })
  return tokens;
}

export const searchTagToTagTokenMapper = {
  map,
}