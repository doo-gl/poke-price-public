import {cardPriceSelectionRetriever} from "./CardPriceSelectionRetriever";
import {CardPriceSelectionEntity, PriceType} from "./CardPriceSelectionEntity";
import {EbayOpenListingEntity, ListingState} from "../../ebay/open-listing/EbayOpenListingEntity";
import {searchParamValidator} from "../../ebay/search-param/SearchParamValidator";
import {logger} from "firebase-functions";
import {BatchUpdate} from "../../../database/BaseCrudRepository";
import {ebayOpenListingRepository, ebayOpenListingUpdater} from "../../ebay/open-listing/EbayOpenListingRepository";
import {Create} from "../../../database/Entity";
import {missingSelectionGenerator} from "./MissingSelectionGenerator";
import {cardSelectionUniquenessEnforcer} from "./CardSelectionUniquenessEnforcer";
import {cardStatsRetrieverV2} from "./CardStatsRetriever";

const isListingInSelection = (selection:CardPriceSelectionEntity, listing:EbayOpenListingEntity|Create<EbayOpenListingEntity>):boolean => {

  if (
    selection.priceType !== PriceType.LISTING_PRICE
    || listing.state !== ListingState.OPEN
  ) {
    return false
  }

  if (
    selection.cardId !== listing.cardId
    || selection.condition !== listing.condition
    || selection.currencyCode !== listing.mostRecentPrice.currencyCode
  ) {
    return false
  }

  if (!listing.listingName) {
    return false;
  }

  const listingName:string = listing.listingName;
  const validationResult = searchParamValidator.validate(selection.searchParams, listingName);
  if (!validationResult.isValid) {
    // @ts-ignore
    const message = listing.id
      // @ts-ignore
      ? `Listing with id: ${listing.id} does not match selection: ${selection.id}: ${validationResult.reasons.join(', ')}`
      : `Listing with ebay id: ${listing.listingId} does not match selection: ${selection.id}: ${validationResult.reasons.join(', ')}`
    logger.info(message);
    return false;
  }

  return true
}

const reconcileListings = async (selection:CardPriceSelectionEntity, listings:Array<EbayOpenListingEntity>):Promise<void> => {
  const updates:Array<BatchUpdate<EbayOpenListingEntity>> = [];
  listings.forEach(listing => {
    const selectionIds = listing.selectionIds ?? []
    const listingInSelection = isListingInSelection(selection, listing);
    const listingHasSelectionId = selectionIds.some(selectionId => selectionId === selection.id);
    if (listingInSelection && !listingHasSelectionId) {
      const newSelectionIds = selectionIds.concat([selection.id])
      updates.push({ id: listing.id, update: { selectionIds: newSelectionIds } })
    }
    if (!listingInSelection && listingHasSelectionId) {
      const newSelectionIds = selectionIds.filter(selectionId => selectionId !== selection.id)
      updates.push({ id: listing.id, update: { selectionIds: newSelectionIds } })
    }
  })
  await ebayOpenListingRepository.batchUpdate(updates);
}

const reconcile = async (selectionId:string):Promise<void> => {
  const selection = await cardPriceSelectionRetriever.retrieve(selectionId);

  await ebayOpenListingRepository.iterator()
    .queries([
      { field: "selectionIds", operation: "array-contains", value: selectionId },
    ])
    .iterateBatch(async listings => {
      await reconcileListings(selection, listings);
      return false;
    })

  await ebayOpenListingRepository.iterator()
    .queries([
      { field: "cardId", operation: "==", value: selection.cardId },
      { field: "searchIds", operation: "array-contains", value: selection.searchId },
      { field: "condition", operation: "==", value: selection.condition },
      { field: "mostRecentPrice.currencyCode", operation: "==", value: selection.currencyCode },
      { field: "state", operation: "==", value: ListingState.OPEN },
    ])
    .iterateBatch(async listings => {
      await reconcileListings(selection, listings);
      return false;
    })
}

const reconcileListing = async (listing:EbayOpenListingEntity):Promise<void> => {
  const existingSelections = await cardPriceSelectionRetriever.retrieveForCardId(listing.cardId);
  const existingStats = await cardStatsRetrieverV2.retrieveForCardId(listing.cardId)
  const uniqueSelections = await cardSelectionUniquenessEnforcer.enforce(existingSelections, existingStats)
  const selections = await missingSelectionGenerator.generateForListing(listing, uniqueSelections.selections);
  const newSelectionIds = selections
    .filter(selection => isListingInSelection(selection, listing))
    .map(selection => selection.id);
  await ebayOpenListingUpdater.update(listing.id, { selectionIds: newSelectionIds })
}

export const cardSelectionListingReconciler = {
  reconcile,
  reconcileListing,
  isListingInSelection,
}