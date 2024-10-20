import {EbayOpenListingEntity, ListingState} from "../ebay/open-listing/EbayOpenListingEntity";
import {entityArchiver} from "./EntityArchiver";
import {ebayOpenListingRepository} from "../ebay/open-listing/EbayOpenListingRepository";
import {itemRetriever} from "../item/ItemRetriever";
import {ItemEntity, itemRepository, itemUpdater, legacyIdOrFallback} from "../item/ItemEntity";
import moment from "moment";
import {momentToTimestamp, timestampToMoment} from "../../tools/TimeConverter";
import {TaskSupplierBuilder} from "../../infrastructure/TaskSupplierBuilder";
import {taskRunner} from "../../infrastructure/TaskRunner";
import {EventContext, logger} from "firebase-functions";
import {SortOrder} from "../../database/BaseCrudRepository";
import {JobCallback} from "../../jobs/ScheduledJobCreator";
import {dedupe} from "../../tools/ArrayDeduper";
import {uuid} from "../../external-lib/Uuid";
import {batchArray} from "../../tools/ArrayBatcher";

const MAX_NON_OPEN_LISTING_AGE_DAYS = 100
// const MAX_LISTINGS_TO_ARCHIVE_IN_SINGLE_BATCH = 10
const MAX_LISTINGS_TO_ARCHIVE_IN_SINGLE_BATCH = 500
// const TIME_TO_RUN_FOR_SECONDS = 5
const TIME_TO_RUN_FOR_SECONDS = 240

const getCutOff = () => {
  return moment().subtract(MAX_NON_OPEN_LISTING_AGE_DAYS, "days")
}

const canArchiveListing = (listing:EbayOpenListingEntity):boolean => {
  return listing.state !== ListingState.OPEN
    && timestampToMoment(listing.mostRecentUpdate).isBefore(getCutOff())
}

const archiveListings = async (listings:Array<EbayOpenListingEntity>, metadata:any) => {
  await entityArchiver.archive(ebayOpenListingRepository.collectionName, listings, metadata)
  const batches = batchArray(listings.map(listing => listing.id), 500)
  await Promise.all(batches.map(batch => ebayOpenListingRepository.batchDelete(batch)))
}

const retrieveListingsToArchiveForCardId = async (cardId:string):Promise<Array<EbayOpenListingEntity>> => {
  const listingsToArchive = new Array<EbayOpenListingEntity>()
  await ebayOpenListingRepository.iterator()
    .queries([
      {field: "state", operation: "in", value: [ListingState.ENDED, ListingState.UNKNOWN]},
      {field: "cardId", operation: "==", value: cardId},
      {field: "mostRecentUpdate", operation: "<=", value: momentToTimestamp(getCutOff())},
    ])
    .iterateBatch(async listings => {
      listings.forEach(listing => {

        if (!canArchiveListing(listing)) {
          return
        }
        listingsToArchive.push(listing)
      })
    })
  return listingsToArchive
}

const retrieveListingsToArchive = async ():Promise<Array<EbayOpenListingEntity>> => {

  const listingsToArchive = new Array<EbayOpenListingEntity>()
  const cardIds = new Set<string>()
  await ebayOpenListingRepository.iterator()
    .queries([
      {field: "state", operation: "in", value: [ListingState.ENDED, ListingState.UNKNOWN]},
      {field: "mostRecentUpdate", operation: "<=", value: momentToTimestamp(getCutOff())},
    ])
    .sort([{field: "mostRecentUpdate", order: SortOrder.ASC}])
    .batchSize(1)
    .iterate(async listing => {
      const cardId = listing.cardId
      if (!canArchiveListing(listing) || cardIds.has(cardId)) {
        return false
      }
      cardIds.add(cardId)
      const listingsForCardId = await retrieveListingsToArchiveForCardId(cardId)
      listingsForCardId.forEach(listingToArchive => {
        listingsToArchive.push(listingToArchive)
      })
      return listingsToArchive.length >= MAX_LISTINGS_TO_ARCHIVE_IN_SINGLE_BATCH
    })

  return listingsToArchive
}

const archiveBatchOfOldListings = async (listingsToArchive:Array<EbayOpenListingEntity>):Promise<void> => {


  const cardIds = dedupe(listingsToArchive.map(listingToArchive => listingToArchive.cardId), i => i)
  const items = await itemRetriever.retrieveManyByIdOrLegacyId(cardIds)
  const itemIds = dedupe(items.map(item => item._id.toString()), i => i)

  if (listingsToArchive.length > 0) {
    // logger.info(`Archiving ${listingsToArchive.length} Listings for ${itemIds.length} items: ${itemIds.join(", ")}`)
    await archiveListings(listingsToArchive, {
      itemId: null,
      cardId: null,
      itemIds,
      cardIds,
    })
  } else {
    logger.info(`Found no listings to archive`)
  }
}

const archiveBatchOfOldListingsForItem = async (item:ItemEntity):Promise<void> => {
  // logger.info(`Archiving open listings for item: ${item._id.toString()}`)
  const listingsToArchive = await retrieveListingsToArchiveForCardId(legacyIdOrFallback(item))
  if (listingsToArchive.length > 0) {
    // logger.info(`Archiving ${listingsToArchive.length} Listings for item: ${item._id.toString()}`)
    await archiveListings(listingsToArchive, {
      itemId: item._id.toString(),
      cardId: legacyIdOrFallback(item),
      itemIds: [item._id.toString()],
      cardIds: [legacyIdOrFallback(item)],
    })
  }
  if (listingsToArchive.length < MAX_LISTINGS_TO_ARCHIVE_IN_SINGLE_BATCH) {
    await itemUpdater.updateOnly(item._id, {nextEbayOpenListingArchiveTime: moment().add(7, 'days').toDate()})
  }
}

const doArchive = async () => {



  const testPrices = await retrieveListingsToArchive()
  if (testPrices.length <= MAX_LISTINGS_TO_ARCHIVE_IN_SINGLE_BATCH / 2) {
    logger.info(`Found ${testPrices.length} listings to archive, not enough to run job, closing`)
    return
  }

  await taskRunner.runFor(
    TIME_TO_RUN_FOR_SECONDS,
    1,
    async () => {
      const listingsToArchive = await retrieveListingsToArchive()

      if (listingsToArchive.length <= MAX_LISTINGS_TO_ARCHIVE_IN_SINGLE_BATCH / 2) {
        return null
      }

      return {
        id: uuid(),
        doTask: () => archiveBatchOfOldListings(listingsToArchive),
      }
    },
    (err) => {
      logger.error(`Error while processing task`, err);
    }
  )
}

export const ebayOpenListingArchiver = {
  doArchive,
  archiveBatchOfOldListingsForItem,
}

export const EbayListingArchiveJob:JobCallback = async (context:EventContext|null) => {
  logger.info('Starting Archive')
  await ebayOpenListingArchiver.doArchive()
  logger.info('Finished Archive')
  return Promise.resolve();
}