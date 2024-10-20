import {SearchTag, SearchTagEntity, searchTagRepository, SearchTagType, toTag} from "./SearchTagEntity";
import {dedupe} from "../../tools/ArrayDeduper";
import {searchTagRetriever} from "./SearchTagRetriever";
import {toInputValueMap, toInputValueMultiMap} from "../../tools/MapBuilder";
import {Create} from "../../database/mongo/MongoEntity";
import {marketplaceListingRetriever} from "../marketplace/MarketplaceListingRetriever";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {ObjectId} from "mongodb";
import {itemRetriever} from "../item/ItemRetriever";
import {toSet} from "../../tools/SetBuilder";

const existsForTag = async (searchTagType:SearchTagType, tag:SearchTag):Promise<boolean> => {
  switch (searchTagType) {
    case SearchTagType.ITEM:
      return itemRetriever.existsForTag(toTag(tag))
    case SearchTagType.MARKETPLACE_LISTING:
      return marketplaceListingRetriever.existsForTag(toTag(tag))
  }
}

const reconcileNewSearchTags = async (searchTagType:SearchTagType, newSearchTags:Array<SearchTag>) => {
  const dedupedTags = dedupe(newSearchTags, toTag);
  const searchTagEntities = await searchTagRetriever.retrieveByTags(searchTagType, dedupedTags.map(toTag));
  const tagToEntity = toInputValueMap(searchTagEntities, toTag);
  const creates:Array<Create<SearchTagEntity>> = []
  dedupedTags.forEach(searchTag => {
    if (tagToEntity.has(toTag(searchTag))) {
      return;
    }
    creates.push({
      key: searchTag.key,
      value: searchTag.value,
      keyLabel: searchTag.keyLabel,
      valueLabel: searchTag.valueLabel,
      tag: toTag(searchTag),
      type: searchTagType,
      public: searchTag.public || false,
    })
  })
  await searchTagRepository.batchCreate(creates)
}

const reconcileRemovedSearchTags = async (searchTagType:SearchTagType, removedSearchTags:Array<SearchTag>) => {
  const dedupedTags = dedupe(removedSearchTags, toTag);
  const tagsWithNoResults:Array<SearchTag> = [];
  await Promise.all(dedupedTags.map(async tag => {
    const hasResult = await existsForTag(searchTagType, tag);
    if (!hasResult) {
      tagsWithNoResults.push(tag)
    }
  }))
  const searchTagEntities = await searchTagRetriever.retrieveByTags(searchTagType, tagsWithNoResults.map(toTag));
  await searchTagRepository.batchDelete(searchTagEntities.map(entity => entity._id))
}

const removeDuplicateTags = async (searchTagType:SearchTagType, tags:Array<SearchTag>):Promise<void> => {
  const dedupedTags = dedupe(tags, toTag);
  const searchTagEntities = await searchTagRetriever.retrieveByTags(searchTagType, dedupedTags.map(toTag));
  const sortedTags = searchTagEntities.sort(comparatorBuilder.combineAll(
    comparatorBuilder.objectAttributeASC(value => value.dateCreated.getTime()),
    comparatorBuilder.objectAttributeASC(value => value._id.toString()),
  ))
  const tagToTagEntities = toInputValueMultiMap(sortedTags, input => toTag(input))
  const deletes:Array<ObjectId> = [];
  [...tagToTagEntities.values()].forEach(searchTags => {
    if (sortedTags.length <= 1) {
      return
    }
    searchTags.slice(1).forEach(tag => deletes.push(tag._id))
  })
  await searchTagRepository.batchDelete(deletes)
}

const reconcileForUpdatedTags = async (searchTagType:SearchTagType, updatedSearchTags:Array<SearchTag>, oldSearchTags:Array<SearchTag>):Promise<void> => {

  const oldTagSet = toSet(oldSearchTags, toTag);
  const addedSearchTags:Array<SearchTag> = [];
  updatedSearchTags.forEach(searchTag => {
    if (oldTagSet.has(toTag(searchTag))) {
      return;
    }
    addedSearchTags.push(searchTag)
  })

  const updatedTagSet = toSet(updatedSearchTags, toTag);
  const removedSearchTags:Array<SearchTag> = [];
  oldSearchTags.forEach(searchTag => {
    if (updatedTagSet.has(toTag(searchTag))) {
      return
    }
    removedSearchTags.push(searchTag)
  })

  if (addedSearchTags.length === 0 && removedSearchTags.length === 0) {
    return;
  }

  await searchTagReconciller.reconcile(searchTagType, addedSearchTags, removedSearchTags)
}

const reconcile = async (searchTagType:SearchTagType, newSearchTags:Array<SearchTag>, removedSearchTags:Array<SearchTag>) => {
  await reconcileNewSearchTags(searchTagType, newSearchTags);
  // instead of checking every time, write a job that periodically checks each search tag to see if it can be removed
  // await reconcileRemovedSearchTags(searchTagType, removedSearchTags);
  await removeDuplicateTags(searchTagType, newSearchTags)
}

export const searchTagReconciller = {
  reconcile,
  reconcileForUpdatedTags,
  removeDuplicateTags,
}