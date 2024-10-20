import {MarketplaceListingEntity, marketplaceListingRepository} from "./MarketplaceListingEntity";
import {dedupe} from "../../tools/ArrayDeduper";
import {flattenArray} from "../../tools/ArrayFlattener";
import {searchTagReconciller} from "../search-tag/SearchTagReconciller";
import {SearchTagType, toTag} from "../search-tag/SearchTagEntity";


const deleteListings = async (listings:Array<MarketplaceListingEntity>) => {
  const removedSearchTags = dedupe(
    flattenArray(listings.map(listing => listing.searchTags)),
    tag => toTag(tag)
  )
  await marketplaceListingRepository.batchDelete(listings.map(listing => listing._id));
  await searchTagReconciller.reconcile(SearchTagType.MARKETPLACE_LISTING, [], removedSearchTags)
}

export const marketplaceListingDeleter = {
  deleteListings,
}