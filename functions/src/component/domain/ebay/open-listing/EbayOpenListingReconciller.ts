import {logger} from "firebase-functions";
import {EbayCardSearchParamEntity} from "../search-param/EbayCardSearchParamEntity";
import {BatchUpdate, QueryOptions} from "../../../database/BaseCrudRepository";
import {searchParamValidator} from "../search-param/SearchParamValidator";
import {EbayOpenListingEntity} from "./EbayOpenListingEntity";
import {ebayOpenListingRepository} from "./EbayOpenListingRepository";
import {marketplaceListingRepository} from "../../marketplace/MarketplaceListingEntity";
import {marketplaceListingRetriever} from "../../marketplace/MarketplaceListingRetriever";
import {toInputValueMap} from "../../../tools/MapBuilder";
import {ObjectId} from "mongodb";

export interface ReconcileOpenListingResult {
  cardId:string,
  searchId:string,
  numberOfListingsProcessed:number,
  numberOfListingsUpdated:number,
}

const BATCH_SIZE = 50;

const reconcileBatch = async (searchParams:EbayCardSearchParamEntity, listings:Array<EbayOpenListingEntity>):Promise<ReconcileOpenListingResult> => {
  logger.info(`Reconciling batch of ${listings.length} against search: ${searchParams.id}`)
  const batchUpdates:Array<BatchUpdate<EbayOpenListingEntity>> = [];
  const marketListings = await marketplaceListingRetriever.retrieveForListingIds(listings.map(listing => listing.id))
  const listingIdToMarketListing = toInputValueMap(marketListings, input => input.listingId)
  const marketListingIdsToDelete:Array<ObjectId> = []

  listings.forEach(listing => {
    const marketListing = listingIdToMarketListing.get(listing.id)
    const isListingAssociatedWithSearch = listing.searchIds.some(searchId => searchId === searchParams.id);
    if (isListingAssociatedWithSearch) {
      return;
    }

    if (!listing.listingName) {
      if (marketListing) {
        marketListingIdsToDelete.push(marketListing._id)
      }
      return;
    }

    const listingName:string = listing.listingName;
    const validationResult = searchParamValidator.validate(searchParams, listingName);
    if (!validationResult.isValid) {
      if (marketListing) {
        marketListingIdsToDelete.push(marketListing._id)
      }
      logger.info(`Listing with id: ${listing.id} does not match search: ${searchParams.id}: ${validationResult.reasons.join(', ')}`);
      return;
    }

    const newSearchIds = listing.searchIds.slice();
    newSearchIds.push(searchParams.id)
    const batchUpdate:BatchUpdate<EbayOpenListingEntity> = {
      id: listing.id,
      update: { searchIds: newSearchIds },
    }
    logger.info(`Associating listing: ${listing.id} with search: ${searchParams.id}`)
    batchUpdates.push(batchUpdate);
  });

  await Promise.all([
    await marketplaceListingRepository.batchDelete(marketListingIdsToDelete),
    await ebayOpenListingRepository.batchUpdate(batchUpdates),
  ])

  return {
    cardId: searchParams.cardId,
    searchId: searchParams.id,
    numberOfListingsProcessed: listings.length,
    numberOfListingsUpdated: batchUpdates.length,
  }
}

const reconcileInBatches = async (searchParams:EbayCardSearchParamEntity, startAfterId:string|null):Promise<ReconcileOpenListingResult> => {
  const queryOptions:QueryOptions<EbayOpenListingEntity> = startAfterId
    ? {limit: BATCH_SIZE, startAfterId}
    : {limit: BATCH_SIZE}

  const listingBatch = await ebayOpenListingRepository.getMany([{ field: "cardId", operation: "==", value: searchParams.cardId }], queryOptions)
  if (listingBatch.length === 0) {
    return { cardId: searchParams.cardId, searchId: searchParams.id, numberOfListingsProcessed: 0, numberOfListingsUpdated: 0 };
  }
  const lastListingId = listingBatch[listingBatch.length - 1].id;

  const reconcileResult = await reconcileBatch(searchParams, listingBatch);
  const nextReconcileResult = await reconcileInBatches(searchParams, lastListingId);
  return {
    cardId: reconcileResult.cardId,
    searchId: reconcileResult.searchId,
    numberOfListingsProcessed: reconcileResult.numberOfListingsProcessed + nextReconcileResult.numberOfListingsProcessed,
    numberOfListingsUpdated: reconcileResult.numberOfListingsUpdated + nextReconcileResult.numberOfListingsUpdated,
  }
}

export const ebayOpenListingReconciler = {
  reconcileInBatches,
}