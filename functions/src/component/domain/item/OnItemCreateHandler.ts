import {ItemEntity} from "./ItemEntity";
import {searchTagReconciller} from "../search-tag/SearchTagReconciller";
import {SearchTagType} from "../search-tag/SearchTagEntity";


const afterCreate = async (createdItem:ItemEntity):Promise<void> => {
  await searchTagReconciller.reconcile(SearchTagType.ITEM, createdItem.searchTags, [])
}

export const onItemCreateHandler = {
  afterCreate,
}