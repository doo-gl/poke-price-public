import {itemTagExtractor} from "./tag/ItemTagExtractor";
import {SearchTagType, toTag} from "../search-tag/SearchTagEntity";
import {lodash} from "../../external-lib/Lodash";
import {searchTagReconciller} from "../search-tag/SearchTagReconciller";
import {ItemEntity} from "./ItemEntity";
import {Update} from "../../database/mongo/MongoEntity";
import {ObjectId} from "mongodb";
import {itemSortExtractor} from "./sort/ItemSortExtractor";


const onItemUpdate = async (
  updater:(id:ObjectId, update:Update<ItemEntity>) => Promise<void>,
  updatedItem:ItemEntity
):Promise<void> => {
  const itemUpdate:Update<ItemEntity> = {}
  let reconcileSearchTags = false;

  const newSearchTags = itemTagExtractor.extract(updatedItem)
  const oldSearchTags = updatedItem.searchTags;
  if (lodash.isNotEqual(newSearchTags, oldSearchTags)) {
    reconcileSearchTags = true;
    itemUpdate.searchTags = newSearchTags;
    itemUpdate.tags = newSearchTags.map(toTag)
  }

  const newSort = itemSortExtractor.extract(updatedItem);
  const oldSort = updatedItem.sort;
  if (lodash.isNotEqual(newSort, oldSort)) {
    itemUpdate.sort = newSort
  }

  if (Object.keys(itemUpdate).length === 0) {
    return;
  }

  await Promise.all([
    updater(updatedItem._id, itemUpdate),
    reconcileSearchTags ? searchTagReconciller.reconcileForUpdatedTags(SearchTagType.ITEM, newSearchTags, oldSearchTags) : Promise.resolve(),
  ])

}

export const onItemUpdateHandler = {
  onItemUpdate,
}