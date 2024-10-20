import {
  BuyingOpportunity,
  BY_TIMESTAMP_DESC,
  EbayOpenListingEntity,
  ListingState,
  ListingType,
  OpenListingHistory,
} from "./EbayOpenListingEntity";
import {ebayOpenListingRetriever} from "./EbayOpenListingRetriever";
import {momentToTimestamp, timestampToMoment} from "../../../tools/TimeConverter";
import moment from "moment/moment";
import {logger} from "firebase-functions";
import {
  EbayOpenListingCheckResult,
  openListingPageChecker,
  ResultType,
} from "../card-price/open-listing-retrieval/OpenListingPageChecker";
import {Create, Update} from "../../../database/Entity";
import {nextCheckTimestampCalculator} from "./NextCheckTimestampCalculator";
import {ebayOpenListingUpdater} from "./EbayOpenListingRepository";
import {HistoricalCardPriceEntity, State} from "../../historical-card-price/HistoricalCardPriceEntity";
import {CardDataSource} from "../../card/CardDataSource";
import {PriceDataType} from "../../historical-card-price/PriceDataType";
import {UnexpectedError} from "../../../error/UnexpectedError";
import {historicalCardPriceRetriever} from "../../historical-card-price/HistoricalCardPriceRetriever";
import {historicalCardPriceCreator} from "../../historical-card-price/HistoricalCardPriceCreator";
import {toInputValueSet} from "../../../tools/SetBuilder";
import {union} from "../../../tools/SetOperations";
import {lodash} from "../../../external-lib/Lodash";
import {historicalCardPriceUpdater} from "../../historical-card-price/HistoricalCardPriceUpdater";
import {ebaySearchParamRetriever} from "../search-param/EbayCardSearchParamRetriever";
import {searchParamValidator} from "../search-param/SearchParamValidator";
import {cardConditionCalculator} from "./CardConditionCalculator";
import {CardCondition} from "../../historical-card-price/CardCondition";

import {buyingOpportunityCalculatorV2} from "./BuyingOpportunityCalculatorV2";
import {openListingItemWatchHandler} from "../../watch/OpenListingItemWatchHandler";
import {TimestampStatic} from "../../../external-lib/Firebase";
import {marketplaceEbayListingWatcher} from "../../marketplace/MarketplaceEbayListingWatcher";
import {itemRetriever} from "../../item/ItemRetriever";
import {cardItemRetriever} from "../../item/CardItemRetriever";
import {anomalousSaleDetector} from "./AnomalousSaleDetector";
import {itemModificationIdentifier} from "../../modification/ItemModificationIdentifier";
import {ExternalClientError} from "../../../error/ExternalClientError";

export interface OpenListingCardPriceDetails {
  openListingId:string,
  listingUrl:string,
  listingName:string,
  listingTypes:Array<ListingType>,
  imageUrls:Array<string>|null,
  bidCount:number|null,
}

const updateListing = async (listingId:string, update:Update<EbayOpenListingEntity>):Promise<void> => {
  await ebayOpenListingUpdater.updateOnly(listingId, update);
}

const mapListingSearchIds = async (openListing:EbayOpenListingEntity):Promise<Array<string>> => {
  const searchIds = openListing.searchIds.slice();
  const currentlyActiveSearchParams = await ebaySearchParamRetriever.retrieveSearchParamsForCardId(openListing.cardId);
  currentlyActiveSearchParams.forEach(searchParam => {

    const isSearchParamAlreadyInListing = searchIds.some(searchId => searchId === searchParam.id);
    if (isSearchParamAlreadyInListing) {
      return;
    }

    const validationResult = searchParamValidator.validate(searchParam, openListing.listingName);
    if (!validationResult.isValid) {
      logger.info(`Filtered: ${openListing.listingName} - ${validationResult.reasons.join(', ')}`);
      return;
    }

    searchIds.push(searchParam.id);
  })
  return searchIds;
}

const updateHistoricalCardPrice = async (preExistingPrice:HistoricalCardPriceEntity, newPrice:Create<HistoricalCardPriceEntity>):Promise<HistoricalCardPriceEntity> => {
  const update:Update<HistoricalCardPriceEntity> = {};

  const currentSearchIds = toInputValueSet(preExistingPrice.searchIds);
  const newSearchIds = toInputValueSet(newPrice.searchIds);
  const mergedSearchIds = union(currentSearchIds, newSearchIds);
  if (mergedSearchIds.size !== currentSearchIds.size) {
    update.searchIds = [...mergedSearchIds];
  }

  if (lodash.isNotEqual(preExistingPrice.currencyAmount, newPrice.currencyAmount)) {
    update.currencyAmount = newPrice.currencyAmount;
  }

  if (preExistingPrice.timestamp.toMillis() !== newPrice.timestamp.toMillis()) {
    update.timestamp = newPrice.timestamp;
  }

  if (lodash.isNotEqual(preExistingPrice.sourceDetails, newPrice.sourceDetails)) {
    update.sourceDetails = newPrice.sourceDetails
  }

  if (lodash.isNotEqual(preExistingPrice.condition, newPrice.condition)) {
    update.condition = newPrice.condition
  }

  if (lodash.isNotEqual(preExistingPrice.itemModification, newPrice.itemModification)) {
    update.itemModification = newPrice.itemModification
  }

  const updateFields = Object.keys(update);
  if (updateFields.length === 0) {
    logger.info(`Found pre-existing historical card price with source type ${preExistingPrice.sourceType}, id: ${preExistingPrice.sourceId}, not creating a new one.`);
    return preExistingPrice
  }
  const updatedPrice = await historicalCardPriceUpdater.updateAndReturn(preExistingPrice.id, update);
  return updatedPrice;
}

const upsertHistoricalCardPrice = async (openListing:EbayOpenListingEntity):Promise<HistoricalCardPriceEntity> => {

  if (!openListing.listingEndTime) {
    throw new UnexpectedError(`Trying to create a historical card price with a null timestamp on open listing: ${openListing.id}`)
  }

  const searchIds = await mapListingSearchIds(openListing);

  const details:OpenListingCardPriceDetails = {
    openListingId: openListing.id,
    listingUrl: openListing.listingUrl,
    listingName: openListing.listingName,
    listingTypes: openListing.listingTypes,
    imageUrls: openListing.imageUrls,
    bidCount: openListing.mostRecentBidCount,
  }
  const create:Create<HistoricalCardPriceEntity> = {
    cardId: openListing.cardId,
    sourceType: CardDataSource.EBAY_CARD_LISTING,
    sourceId: openListing.listingId,
    priceDataType: PriceDataType.SOLD_PRICE,
    timestamp: openListing.listingEndTime,
    currencyAmount: openListing.mostRecentPrice,
    searchIds,
    selectionIds: [],
    sourceDetails: details,
    condition: openListing.condition,
    state: State.ACTIVE,
    deactivationDetails: null,
    itemModification: openListing.itemModification ?? null,
  }

  const preExistingPrice = await historicalCardPriceRetriever.retrieveBySourceId(create.sourceType, create.sourceId);
  if (preExistingPrice) {
    return updateHistoricalCardPrice(preExistingPrice, create);
  }
  const createdPrice = await historicalCardPriceCreator.create(create);
  return createdPrice;
}

const updateEndedWithSaleListing = async (openListing:EbayOpenListingEntity, openListingResult:EbayOpenListingCheckResult):Promise<void> => {
  await updateEndedListing(openListing, openListingResult);
  const endedListing = await ebayOpenListingRetriever.retrieve(openListing.id)
  const item = await cardItemRetriever.retrieve(openListing.cardId)
  const price = await upsertHistoricalCardPrice(endedListing);
  const anomalousSale = anomalousSaleDetector.detect(price, item)
  await updateListing(openListing.id, { historicalCardPriceId: price.id, anomalousSale });
}

const createHistoryUpdate = (openListing:EbayOpenListingEntity, openListingResult:EbayOpenListingCheckResult):Update<EbayOpenListingEntity> => {
  const currentHistory = openListing.history;
  const newHistoryEntry:OpenListingHistory = {
    timestamp: TimestampStatic.now(),
    bidCount: openListingResult.bidCount,
    price: openListingResult.price,
    searchId: null,
    searchUrl: null,
  };
  const newHistory = currentHistory
    .slice()
    .concat([newHistoryEntry])
    .sort(BY_TIMESTAMP_DESC)
    .slice(0, 20) // only keep the last 20 updates

  const update:Update<EbayOpenListingEntity> = {
    history: newHistory,
    mostRecentUpdate: newHistoryEntry.timestamp,
    mostRecentBidCount: newHistoryEntry.bidCount,
    mostRecentPrice: newHistoryEntry.price || openListing.mostRecentPrice,
    buyItNowPrice: openListingResult.buyItNowPrice || openListing.buyItNowPrice || null,
  }
  return update;
}

const mapListingToCondition = (openListing:EbayOpenListingEntity, openListingResult:EbayOpenListingCheckResult):CardCondition => {
  return cardConditionCalculator.calculate({
    id: openListing.id,
    listingDescription: openListingResult.description,
    listingName: openListingResult.listingName ?? '',
    listingSpecifics: openListingResult.listingSpecifics,
    sellersNotes: openListingResult.sellersNotes,
  })
}

const updateLiveListing = async (openListing:EbayOpenListingEntity, openListingResult:EbayOpenListingCheckResult):Promise<void> => {
  const wasCreatedMoreThanThreeMonthsAgo = timestampToMoment(openListing.dateCreated).add(3, 'months').isBefore(moment());
  if (wasCreatedMoreThanThreeMonthsAgo) {
    await updateListing(openListing.id, {
      state: ListingState.UNKNOWN,
      unknownDetails: {
        reason: 'More than 3 months since listing started',
      },
      buyingOpportunity: null,
    });
    return;
  }

  const update = createHistoryUpdate(openListing, openListingResult);

  const item = await itemRetriever.retrieveByIdOrLegacyId(openListing.cardId);
  const buyingOpportunity:BuyingOpportunity|null = item
    ? buyingOpportunityCalculatorV2.calculateFromCheck(openListing, openListingResult, item)
    : null;
  const condition = mapListingToCondition(openListing, openListingResult)

  const listingEndTime = openListingResult.endedTimestamp ? momentToTimestamp(openListingResult.endedTimestamp) : openListing.listingEndTime;
  const nextCheckTimestamp = nextCheckTimestampCalculator.calculateV2({
    listingEndTime: listingEndTime ? timestampToMoment(listingEndTime) : null,
    listingDateCreated: timestampToMoment(openListing.dateCreated),
    listingBuyingOpportunity: buyingOpportunity,
  })


  const itemModificationResult = itemModificationIdentifier.identify({
    item,
    listing: {
      listingName: openListingResult.listingName ?? openListing.listingName,
      listingSpecifics: openListingResult.listingSpecifics,
      listingUrl: openListingResult.url,
    },
  })

  update.condition = condition;
  update.buyingOpportunity = buyingOpportunity;
  update.listingEndTime = listingEndTime;
  update.nextCheckTimestamp = nextCheckTimestamp;
  if (lodash.isNotEqual(openListing.imageUrls, openListingResult.imageUrls)) {
    update.imageUrls = openListingResult.imageUrls;
  }

  if (lodash.isNotEqual(openListing.itemModification, itemModificationResult.itemModification)) {
    update.itemModification = itemModificationResult.itemModification ?? null
  }

  await updateListing(openListing.id, update);
  await openListingItemWatchHandler.onUpdatedOpenListingsForItem(openListing.cardId, [{ id: openListing.id, update: {} }])
}

const updateEndedListing = async (openListing:EbayOpenListingEntity, openListingResult:EbayOpenListingCheckResult):Promise<void> => {
  const update = createHistoryUpdate(openListing, openListingResult);
  const listingEndTime = openListingResult.endedTimestamp ? momentToTimestamp(openListingResult.endedTimestamp) : TimestampStatic.now();
  const condition = mapListingToCondition(openListing, openListingResult)

  if (openListing.buyingOpportunity) {
    update.buyingOpportunity = null;
  }
  update.isBestOffer = openListingResult.isBestOffer
  update.condition = condition;
  update.listingEndTime = listingEndTime;
  update.state = ListingState.ENDED;
  update.listingMessage = openListingResult.listingMessage;
  await updateListing(openListing.id, update);
}

const resultMatchesListing = async (openListing:EbayOpenListingEntity, openListingResult:EbayOpenListingCheckResult):Promise<boolean> => {
  if (openListing.listingName === openListingResult.listingName) {
    return true;
  }
  const searchParams = await ebaySearchParamRetriever.retrieveSearchParamsForCardId(openListing.cardId);
  if (searchParams.length === 0 || openListingResult.listingName === null) {
    return false;
  }
  const searchParam = searchParams[0];
  const validatedListingName = searchParamValidator.validate(searchParam, openListingResult.listingName);
  if (!validatedListingName.isValid) {
    logger.info(`Listing at url: ${openListing.listingUrl} no longer matches listing: ${openListing.id}, ${validatedListingName.reasons.join(', ')}`)
  }
  return validatedListingName.isValid;
}

const updateNextCheckTime = async (openListing:EbayOpenListingEntity):Promise<void> => {
  const nextCheckTimestamp = nextCheckTimestampCalculator.calculateV2({
    listingEndTime: openListing.listingEndTime ? timestampToMoment(openListing.listingEndTime) : null,
    listingDateCreated: timestampToMoment(openListing.dateCreated),
    listingBuyingOpportunity: openListing.buyingOpportunity,
  });
  // const nextCheckTimestamp = nextCheckTimestampCalculator.calculate(null, timestampToMoment(openListing.dateCreated));
  await updateListing(openListing.id, { nextCheckTimestamp })
}

const checkResultAgainstListing = async (openListing:EbayOpenListingEntity, openListingResult:EbayOpenListingCheckResult):Promise<void> => {
  if (openListingResult.resultType === ResultType.LISTING_IS_MISSING) {
    logger.info(`Listing ${openListing.id} on url ${openListing.listingUrl} is missing`)
    await updateListing(openListing.id, {
      state: ListingState.UNKNOWN,
      unknownDetails: {
        reason: 'Listing is missing',
        result: openListingResult,
      },
      buyingOpportunity: null,
    });
    return;
  }

  if (openListingResult.resultType === ResultType.UNKNOWN) {
    logger.info(`Listing ${openListing.id} on url ${openListing.listingUrl} is unknown`)
    await updateListing(openListing.id, {
      state: ListingState.UNKNOWN,
      unknownDetails: {
        reason: 'Listing is unknown',
        result: openListingResult,
      },
      buyingOpportunity: null,
    });
    return;
  }

  const isListingStillTheSame = await resultMatchesListing(openListing, openListingResult);
  if (!isListingStillTheSame) {
    logger.info(`Listing ${openListing.id} on url ${openListing.listingUrl} is no longer matches name`)
    await updateListing(openListing.id, {
      state: ListingState.UNKNOWN,
      unknownDetails: {
        reason: 'Listing name no longer matches',
        result: openListingResult,
      },
      buyingOpportunity: null,
    });
    return;
  }

  if (openListingResult.resultType === ResultType.LIVE) {
    // logger.info(`Listing ${openListing.id} on url ${openListing.listingUrl} is still live`)
    await updateLiveListing(openListing, openListingResult)
    return;
  }

  if (openListingResult.resultType === ResultType.ENDED_WITHOUT_SALE || openListingResult.isBestOffer) {
    if (openListingResult.resultType === ResultType.ENDED_WITHOUT_SALE) {
      logger.info(`Listing ${openListing.id} on url ${openListing.listingUrl} ended without sale`)
    }
    if (openListingResult.isBestOffer) {
      logger.info(`Listing ${openListing.id} on url ${openListing.listingUrl} ended with best offer`)
    }
    await updateEndedListing(openListing, openListingResult);
    return;
  }

  if (openListingResult.resultType === ResultType.ENDED_WITH_SALE) {
    logger.info(`Listing ${openListing.id} on url ${openListing.listingUrl} ended with sale`)
    await updateEndedWithSaleListing(openListing, openListingResult);
    return;
  }
  throw new UnexpectedError(`Unrecognised result type ${openListingResult.resultType} from result for listing with id: ${openListing.id}, details: ${JSON.stringify(openListingResult)}`)
}

const checkFromListing = async (openListing:EbayOpenListingEntity):Promise<void> => {

  try {
    const openListingResult = await openListingPageChecker.check(openListing.listingUrl);
    await checkResultAgainstListing(openListing, openListingResult)
    const item = await itemRetriever.retrieveOptionalByLegacyId(openListing.cardId)
    if (!item) {
      return;
    }
    await marketplaceEbayListingWatcher.onUpdatedListingsForCard(item, [{id: openListing.id, update: {}}])
  } catch (err:any) {
    if (err instanceof ExternalClientError) {
      logger.error(`Failed to check listing: ${openListing.id}, ${err.message}, ${err.requestMethod}, ${err.url}, ${err.responseStatus}`);
    } else {
      logger.error(`Failed to check listing: ${openListing.id}`, err);
    }
    await updateNextCheckTime(openListing);
  }
}

const checkForListing = async (openListing:EbayOpenListingEntity) => {
  const hasNextCheckTimePassed = timestampToMoment(openListing.nextCheckTimestamp).isBefore(moment());
  if (!hasNextCheckTimePassed) {
    logger.info(`Open listing with id: ${openListing.id}, for card: ${openListing.cardId}, is not passed it's next check time of ${openListing.nextCheckTimestamp.toDate().toISOString()}`);
    return;
  }

  await checkFromListing(openListing)
}

const check = async (openListingId:string):Promise<void> => {
  const openListing = await ebayOpenListingRetriever.retrieve(openListingId);
  await checkFromListing(openListing)
}

export const ebayOpenListingChecker = {
  check,
  checkFromListing,
  checkResultAgainstListing,
}