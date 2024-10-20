import {Create, Update} from "../../../database/Entity";
import {BatchUpdate} from "../../../database/BaseCrudRepository";
import {
  BuyingOpportunity,
  BY_TIMESTAMP_DESC,
  EbayOpenListingEntity,
  ListingState,
  OpenListingHistory,
} from "./EbayOpenListingEntity";
import {ebaySearchParamRetriever} from "../search-param/EbayCardSearchParamRetriever";
import {logger} from "firebase-functions";
import {EbayCardSearchParamEntity} from "../search-param/EbayCardSearchParamEntity";
import {
  ebayOpenListingParser,
  OpenListing,
  OpenListingResult,
} from "../card-price/open-listing-retrieval/EbayOpenListingParser";
import {ebayOpenListingRepository} from "./EbayOpenListingRepository";
import {handleAllErrors} from "../../../tools/AllPromiseHandler";
import {toInputValueSet} from "../../../tools/SetBuilder";
import {union} from "../../../tools/SetOperations";
import {lodash} from "../../../external-lib/Lodash";
import {momentToTimestamp} from "../../../tools/TimeConverter";
import {ebayOpenListingRetriever} from "./EbayOpenListingRetriever";
import moment from "moment/moment";

import {nextCheckTimestampCalculator} from "./NextCheckTimestampCalculator";
import {cardConditionCalculator} from "./CardConditionCalculator";
import {nextOpenListingSourcingTimeCalculator} from "./NextOpenListingSourcingTimeCalculator";
import {batchArray} from "../../../tools/ArrayBatcher";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";
import {NotFoundError} from "../../../error/NotFoundError";
import {searchParamValidator} from "../search-param/SearchParamValidator";

import {openListingItemWatchHandler} from "../../watch/OpenListingItemWatchHandler";
import {buyingOpportunityCalculatorV2} from "./BuyingOpportunityCalculatorV2";
import {itemWatchRetriever} from "../../watch/ItemWatchRetriever";
import {Timestamp, TimestampStatic} from "../../../external-lib/Firebase";
import {marketplaceEbayListingWatcher} from "../../marketplace/MarketplaceEbayListingWatcher";
import {itemRetriever} from "../../item/ItemRetriever";
import {ItemEntity, itemUpdater, legacyIdOrFallback} from "../../item/ItemEntity";
import {ObjectId} from "mongodb";
import {itemModificationIdentifier} from "../../modification/ItemModificationIdentifier";
import {ebayOpenListingApiRetriever} from "../card-price/open-listing-retrieval/EbayOpenListingApiRetriever";
import {ebayApiRateLimitQuerier} from "../api/rate-limit/EbayApiRateLimitQuerier";
import {EbayApi} from "../api/rate-limit/EbayApiRateLimitEntity";

export interface OpenListingSourceResult {
  captcha:boolean,
  listingsFound:number,
  listingsFilteredOut:number,
  listingsUpdated:number,
  listingsCreated:number,
}

interface OpenListingChange {
  create:Create<EbayOpenListingEntity>|null,
  update:BatchUpdate<EbayOpenListingEntity>|null,
}

interface OpenListingChanges {
  creates:Array<Create<EbayOpenListingEntity>>,
  updates:Array<BatchUpdate<EbayOpenListingEntity>>,
}



const calculateUpdate = (
  preExistingListing:EbayOpenListingEntity,
  newListing:Create<EbayOpenListingEntity>
):BatchUpdate<EbayOpenListingEntity>|null => {

  const update:Update<EbayOpenListingEntity> = {};

  const history = preExistingListing.history;
  history.push(newListing.history[0]);
  history.sort(BY_TIMESTAMP_DESC);
  // update.history = history;
  const mostRecentEntry = history[0];
  if (mostRecentEntry.price) {
    update.mostRecentPrice = mostRecentEntry.price;
  }
  update.mostRecentBidCount = mostRecentEntry.bidCount;
  update.mostRecentUpdate = mostRecentEntry.timestamp;

  const currentSearchIds = toInputValueSet(preExistingListing.searchIds);
  const newSearchIds = toInputValueSet(newListing.searchIds);
  const mergedSearchIds = union(currentSearchIds, newSearchIds);
  if (mergedSearchIds.size !== currentSearchIds.size) {
    update.searchIds = [...mergedSearchIds];
  }

  if (lodash.isNotEqual(preExistingListing.listingTypes, newListing.listingTypes)) {
    update.listingTypes = newListing.listingTypes;
  }

  if (lodash.isNotEqual(preExistingListing.listingName, newListing.listingName)) {
    update.listingName = newListing.listingName;
  }

  if (lodash.isNotEqual(preExistingListing.sellersNotes, newListing.sellersNotes)) {
    update.sellersNotes = newListing.sellersNotes;
  }

  if (lodash.isNotEqual(preExistingListing.listingDescription, newListing.listingDescription)) {
    update.listingDescription = newListing.listingDescription;
  }

  if (lodash.isNotEqual(preExistingListing.listingSpecifics, newListing.listingSpecifics)) {
    update.listingSpecifics = newListing.listingSpecifics;
  }

  if (!preExistingListing.buyingOpportunity || lodash.isNotEqual(preExistingListing.buyingOpportunity, newListing.buyingOpportunity)) {
    update.buyingOpportunity = newListing.buyingOpportunity;
  }

  if (lodash.isNotEqual(preExistingListing.listingEndTime?.toMillis(), newListing.listingEndTime?.toMillis())) {
    update.listingEndTime = newListing.listingEndTime;
  }

  if (lodash.isNotEqual(preExistingListing.nextCheckTimestamp.toMillis(), newListing.nextCheckTimestamp.toMillis())) {
    update.nextCheckTimestamp = newListing.nextCheckTimestamp;
  }

  if (lodash.isNotEqual(preExistingListing.buyItNowPrice, newListing.buyItNowPrice)) {
    update.buyItNowPrice = newListing.buyItNowPrice;
  }

  if (lodash.isNotEqual(preExistingListing.listingUrl, newListing.listingUrl)) {
    update.listingUrl = newListing.listingUrl;
  }

  if (lodash.isNotEqual(preExistingListing.imageUrls, newListing.imageUrls)) {
    update.imageUrls = newListing.imageUrls;
  }

  if (lodash.isNotEqual(preExistingListing.itemModification, newListing.itemModification)) {
    update.itemModification = newListing.itemModification ?? null
  }

  const updateFields = Object.keys(update);
  if (updateFields.length === 0) {
    logger.info(`Found pre-existing ebay open listing with internal id: ${preExistingListing.id}, ebay id: ${preExistingListing.listingId}, not creating a new one.`);
    return null;
  }
  // logger.info(`Updating ebay open listing with id: ${preExistingListing.id}, fields: ${updateFields.join(',')}`)
  return { id: preExistingListing.id, update };
}

const mapListingToChange = async (
  item:ItemEntity,
  listing:OpenListing,
  searchParams:EbayCardSearchParamEntity
):Promise<OpenListingChange> => {

  const validationResult = searchParamValidator.validate(searchParams, listing.listingName)
  if (!validationResult.isValid) {
    logger.info(`Filtered: ${listing.listingName} - ${validationResult.reasons.join(', ')}`)
    return {
      create: null,
      update: null,
    }
  }

  const itemModificationResult = itemModificationIdentifier.identify({
    item,
    listing: {listingName: listing.listingName, listingSpecifics: listing.listingSpecifics, listingUrl: listing.url},
  })

  if (itemModificationResult.shouldFilter) {
    return {
      create: null,
      update: null,
    }
  }

  // const shouldFilterFromDescription = listingDescriptionFilter.shouldFilter(listing.url, listing.description ?? "")
  // if (shouldFilterFromDescription) {
  //   return {
  //     create: null,
  //     update: null,
  //   }
  // }

  const openListingHistory:OpenListingHistory = {
    timestamp: TimestampStatic.now(),
    price: listing.price,
    bidCount: listing.bidCount,
    searchUrl: listing.searchUrl,
    searchId: searchParams.id,
  }

  const condition = cardConditionCalculator.calculate({
    id: `ebayId:${listing.id}`,
    listingName: listing.listingName,
    sellersNotes: listing.sellersNotes,
    listingDescription: listing.description,
    listingSpecifics: listing.listingSpecifics,
  })

  const buyingOpportunity:BuyingOpportunity|null = buyingOpportunityCalculatorV2.calculateFromSource(listing, condition, item);

  const listingTypes = listing.listingTypes.sort();
  const imageUrls = listing.imageUrls;
  const nextCheckTimestamp:Timestamp = nextCheckTimestampCalculator.calculateV2({
    listingEndTime: listing.endTime,
    listingDateCreated: moment(),
    listingBuyingOpportunity: buyingOpportunity,
  });
  // const nextCheckTimestamp:Timestamp = nextCheckTimestampCalculator.calculate(listing.endTime, moment());

  const create:Create<EbayOpenListingEntity> = {
    cardId: searchParams.cardId,
    historicalCardPriceId: null,
    searchIds: [searchParams.id],
    selectionIds: [],

    mostRecentPrice: listing.price,
    mostRecentUpdate: openListingHistory.timestamp,
    mostRecentBidCount: openListingHistory.bidCount,
    history: [openListingHistory],

    listingTypes,
    listingName: listing.listingName,
    listingEndTime: listing.endTime ? momentToTimestamp(listing.endTime) : null,
    buyItNowPrice: listing.buyItNowPrice,
    listingUrl: listing.url,
    listingId: listing.id,
    imageUrls,
    sellersNotes: listing.sellersNotes,
    listingDescription: listing.description,
    listingSpecifics: listing.listingSpecifics,
    condition,

    state: ListingState.OPEN,
    unknownDetails: null,
    nextCheckTimestamp,
    listingMessage: null,
    buyingOpportunity,

    itemModification: itemModificationResult.itemModification ?? null,
  };

  const preExistingListing = await ebayOpenListingRetriever.retrieveByListingId(listing.id)
  if (preExistingListing) {
    const update = calculateUpdate(preExistingListing, create);
    return { create: null, update };
  }

  return {
    create,
    update: null,
  }
}

const mapListingsToChanges = async (
  item:ItemEntity,
  listings:Array<OpenListing>,
  searchParams:EbayCardSearchParamEntity,
):Promise<OpenListingChanges> => {

  const listingChangeList:Array<OpenListingChange> = await handleAllErrors(
    listings.map(listing => mapListingToChange(item, listing, searchParams)),
    'Failed to map listing'
  );
  const creates:Array<Create<EbayOpenListingEntity>> = [];
  const updates:Array<BatchUpdate<EbayOpenListingEntity>> = [];
  listingChangeList.forEach(change => {
    if (change.create) {
      creates.push(change.create);
    }
    if (change.update) {
      updates.push(change.update);
    }
  })
  return {creates, updates}
}

const commitChanges = async (item:ItemEntity, changes:OpenListingChanges):Promise<{ creates:number, updates:number }> => {
  const queue = new ConcurrentPromiseQueue({maxNumberOfConcurrentPromises: 1})
  const createBatches = batchArray(changes.creates, 10);
  logger.info(`Creating ${changes.creates.length} new listings, updating ${changes.updates.length} existing listings`)
  await handleAllErrors(
    createBatches.map(batch => queue.addPromise(() => ebayOpenListingRepository.batchCreate(batch))),
      'Failed to create batch'
  );
  await openListingItemWatchHandler.onNewOpenListings(changes.creates)
  await marketplaceEbayListingWatcher.onNewOpenListingsForCard(item, changes.creates)
  const updateBatches = batchArray(changes.updates, 10);
  await handleAllErrors(
    updateBatches.map(batch => queue.addPromise(() => ebayOpenListingRepository.batchUpdate(batch))),
    'Failed to update batch'
  );
  await openListingItemWatchHandler.onUpdatedOpenListingsForItem(item.legacyId, changes.updates)
  await marketplaceEbayListingWatcher.onUpdatedListingsForCard(item, changes.updates)
  return {
    creates: changes.creates.length,
    updates: changes.updates.length,
  }
}

const updateItem = async (item:ItemEntity):Promise<void> => {
  const isBeingWatched = await itemWatchRetriever.isItemBeingWatched(legacyIdOrFallback(item))
  const nextEbayOpenListingSourcing = nextOpenListingSourcingTimeCalculator.calculate(item, isBeingWatched)
  await itemUpdater.updateOnly(item._id, {
    nextEbayOpenListingSourcingTime: nextEbayOpenListingSourcing.toDate(),
  })
}

const sourceEntitiesFromListings = async (
  item:ItemEntity,
  listings:Array<OpenListing>,
  searchParams:EbayCardSearchParamEntity,
):Promise<{ creates:number, updates:number }> => {
  const itemPriceChanges = await mapListingsToChanges(item, listings, searchParams);
  const commitResults = await commitChanges(item, itemPriceChanges);
  return commitResults
}

const retrieveListingsUsingApi = async (item:ItemEntity, searchParams:EbayCardSearchParamEntity):Promise<OpenListingResult> => {
  const start:Date = new Date();
  const openListings = await ebayOpenListingApiRetriever.retrieve(searchParams);
  const end:Date = new Date();
  const timeTakenSeconds = (end.getTime() - start.getTime()) / 1000;
  logger.info(`Sourced via API open listings for item id: ${item._id.toString()}, found: ${openListings.listings.length} listings in ${timeTakenSeconds}s`)
  return openListings
}

const retrieveListingsUsingWebScraping = async (item:ItemEntity, searchParams:EbayCardSearchParamEntity):Promise<OpenListingResult> => {
  const start:Date = new Date();
  const openListings = await ebayOpenListingParser.parse(searchParams);
  const end:Date = new Date();
  const timeTakenSeconds = (end.getTime() - start.getTime()) / 1000;
  logger.info(`Sourced via Scraping open listings for item id: ${item._id.toString()}, found: ${openListings.listings.length} listings in ${timeTakenSeconds}s`)
  return openListings
}

const retrieveListings = async (item:ItemEntity, searchParams:EbayCardSearchParamEntity):Promise<OpenListingResult> => {
  const canApiBeCalled = await ebayApiRateLimitQuerier.canApiBeCalled(EbayApi.BUY_BROWSE)
  if (!canApiBeCalled) {
    return retrieveListingsUsingWebScraping(item, searchParams)
  }
  try {
    return await retrieveListingsUsingApi(item, searchParams)
  } catch (err:any) {
    logger.error(`Received error while using Ebay API: ${err.message}`, err)
    return await retrieveListingsUsingWebScraping(item, searchParams)
  }
}

const sourceForSearch = async (item:ItemEntity, searchParams:EbayCardSearchParamEntity):Promise<OpenListingSourceResult> => {
  const openListings:OpenListingResult = await retrieveListings(item, searchParams)
  const cardPriceChanges = await mapListingsToChanges(item, openListings.listings, searchParams);
  const commitResults = await commitChanges(item, cardPriceChanges);
  return {
    captcha: openListings.captcha,
    listingsFound: openListings.listings.length,
    listingsFilteredOut: openListings.numberOfFilteredListings,
    listingsCreated: commitResults.creates,
    listingsUpdated: commitResults.updates,
  }
}

const getSearchParamForLegacyId = async (legacyItemId:string|undefined):Promise<EbayCardSearchParamEntity|null> => {
  if (!legacyItemId) {
    return null;
  }
  const searchParams = await ebaySearchParamRetriever.retrieveSearchParamsForCardId(legacyItemId);
  if (!searchParams || searchParams.length === 0) {
    return null
  }
  if (searchParams.length > 1) {
    logger.error(`Found ${searchParams.length} search params for item with id: ${legacyItemId}, expected 1, found ids: ${searchParams.map(sp => sp.id).join(',')}`);
  }
  const searchParam = searchParams[0];
  return searchParam
}

const getSearchParamsForItemId = async (itemId:ObjectId):Promise<EbayCardSearchParamEntity|null> => {
  const searchParams = await ebaySearchParamRetriever.retrieveSearchParamsForItemId(itemId.toString());
  if (!searchParams || searchParams.length === 0) {
    return null
  }
  if (searchParams.length > 1) {
    logger.error(`Found ${searchParams.length} search params for item with id: ${itemId.toString()}, expected 1, found ids: ${searchParams.map(sp => sp.id).join(',')}`);
  }
  const searchParam = searchParams[0];
  return searchParam
}

const getSearchParam = async (itemId:string|undefined):Promise<EbayCardSearchParamEntity|null> => {
  if (!itemId) {
    return null;
  }
  if (ObjectId.isValid(itemId)) {
    const params = await getSearchParamsForItemId(new ObjectId(itemId))
    if (params) {
      return params
    }
  }
  return getSearchParamForLegacyId(itemId)
}

const sourceForSearches = async (item:ItemEntity):Promise<OpenListingSourceResult> => {
  const searchParam = await getSearchParamsForItemId(item._id)
  if (!searchParam) {
    logger.info(`Did not find ebay search params for item legacy Id: ${item.legacyId}`);
    return Promise.resolve({ captcha: false, listingsCreated: 0, listingsFilteredOut: 0, listingsFound: 0, listingsUpdated: 0 });
  }
  const result =  await sourceForSearch(item, searchParam);
  return result;
}

const source = async (legacyItemId:string):Promise<OpenListingSourceResult> => {
  const item = await itemRetriever.retrieveByIdOrLegacyId(legacyItemId);
  return sourceForItem(item)
}

const sourceForItem = async (item:ItemEntity):Promise<OpenListingSourceResult> => {
  try {
    return sourceForSearches(item);
  } catch (e) {
    throw e
  } finally {
    await updateItem(item);
  }
}

const sourceForListings = async (itemId:string, listings:Array<OpenListing>):Promise<void> => {
  const item = await itemRetriever.retrieveByIdOrLegacyId(itemId);
  const searchParam = await getSearchParam(itemId)
  if (!searchParam) {
    throw new NotFoundError(`No search params found for item with id: ${itemId}`)
  }
  await sourceEntitiesFromListings(
    item,
    listings,
    searchParam,
  )
}

export const ebayOpenListingSourcer = {
  source,
  sourceForItem,
  sourceForListings,
  mapListingsToChanges,
  mapListingToChange,
}