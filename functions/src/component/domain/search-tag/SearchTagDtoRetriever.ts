import {SearchTag, SearchTagType, toTag} from "./SearchTagEntity";
import {searchTagRetriever} from "./SearchTagRetriever";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {dedupeInOrder} from "../../tools/ArrayDeduper";


const retrieveTags = async (searchTagType:SearchTagType, tags?:Array<string>):Promise<Array<SearchTag>> => {
  if (!tags || tags.length === 0) {
    return []
  }
  const entities = await searchTagRetriever.retrieveByTags(searchTagType, tags);
  entities.sort(comparatorBuilder.combineAll(
    comparatorBuilder.objectAttributeASC(value => value.dateCreated.getTime()),
    comparatorBuilder.objectAttributeASC(value => value._id.toString())
  ))
  const dedupedTags = dedupeInOrder(entities, toTag)
  return dedupedTags.map(tag => ({
    key: tag.key,
    keyLabel: tag.keyLabel,
    value: tag.value,
    valueLabel: tag.valueLabel,
  }))
}

export const searchTagDtoRetriever = {
  retrieveTags,
}