import {
  BatchUpdate,
  BatchUpdate as MongoBatchUpdate,
  Create,
  Create as MongoCreate,
} from "../../database/mongo/MongoEntity";
import {MarketplaceListingEntity, marketplaceListingRepository} from "./MarketplaceListingEntity";
import {SearchTag, SearchTagType, toTag} from "../search-tag/SearchTagEntity";
import {searchTagReconciller} from "../search-tag/SearchTagReconciller";
import {logger} from "firebase-functions";
import {databaseStatsLogger} from "../../infrastructure/express/DatabaseStatsLogger";

export interface Conversion {
  create?:Create<MarketplaceListingEntity>,
  update?:BatchUpdate<MarketplaceListingEntity>,
  newSearchTags:Array<SearchTag>,
  removedSearchTags:Array<SearchTag>,
}

const upsertForConversions = async (conversions:Array<Conversion>):Promise<void> => {
  const creates:Array<MongoCreate<MarketplaceListingEntity>> = [];
  const updates:Array<MongoBatchUpdate<MarketplaceListingEntity>> = [];
  const newSearchTags = new Map<string, SearchTag>();
  const removedSearchTags = new Map<string, SearchTag>();
  conversions.forEach(conversion => {
    if (conversion.create) {
      creates.push(conversion.create)
    }
    if (conversion.update) {
      updates.push(conversion.update)
    }
    conversion.newSearchTags.forEach(newSearchTag => {
      const tag = toTag(newSearchTag)
      if (newSearchTags.has(tag)) {
        return
      }
      newSearchTags.set(tag, newSearchTag)
    })
    conversion.removedSearchTags.forEach(removedSearchTag => {
      const tag = toTag(removedSearchTag)
      if (removedSearchTags.has(tag)) {
        return
      }
      removedSearchTags.set(tag, removedSearchTag)
    })
  })

  await marketplaceListingRepository.batchCreate(creates)
  await marketplaceListingRepository.batchUpdate(updates)
  await searchTagReconciller.reconcile(
    SearchTagType.MARKETPLACE_LISTING,
    [...newSearchTags.values()],
    [...removedSearchTags.values()]
  )
}

export const marketplaceListingUpserter = {
  upsertForConversions,
}