import {logger} from "firebase-functions";
import {TaskSupplierBuilder} from "../../infrastructure/TaskSupplierBuilder";
import moment from "moment/moment";
import {taskRunner} from "../../infrastructure/TaskRunner";
import {MarketplaceListingEntity, marketplaceListingRepository} from "./MarketplaceListingEntity";
import {marketplaceListingRetriever} from "./MarketplaceListingRetriever";
import {marketListingSynchroniser} from "./MarketListingSynchroniser";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {Moment} from "moment";


const TIME_TO_RUN_FOR_SECONDS = 240;
const MAX_CONCURRENT_TASKS = 20;

const processItem = async (listing:MarketplaceListingEntity) => {
  const start = new Date()
  // logger.info(`Synchronising marketplace listing: ${listing._id.toString()}, based on listing: ${listing.listingId}, most recent update: ${listing.mostRecentUpdate.toISOString()}`)

  await marketListingSynchroniser.synchronise(listing)

  const end = new Date()
  // logger.info(`Synchronised listing: ${listing._id.toString()}, time taken: ${end.getTime() - start.getTime()}ms`);
}

const getCutoff = ():Moment => {
  return moment().subtract(3, 'day')
}

const isBeforeCutoff = (listing:MarketplaceListingEntity):boolean => {
  const cutOff = getCutoff()
  return moment(listing.mostRecentUpdate).isBefore(cutOff)
}

const process = async () => {

  const listingsToCheck = new Array<MarketplaceListingEntity>()
  const listingIdsPulled = new Set<string>()
  const listingIdsProcessed = new Set<string>()
  let mostRecentDateProcessed = new Date(0)
  let newListingReadCount = 0
  const pullListings = async () => {
    const newListings = await marketplaceListingRetriever.retrieveByMostRecentlyUpdatedAsc(100, mostRecentDateProcessed)
    newListingReadCount += newListings.length
    // if the listing has already been updated in the last day, don't bother updating it again
    const listingsBeforeCutOff = newListings.filter(listing => isBeforeCutoff(listing))
    logger.info(`Found ${newListings.length} listings to process, ${listingsBeforeCutOff.length} are before the cut off: ${getCutoff().toISOString()}`)

    listingsBeforeCutOff.forEach(listing => {
      if (!listingIdsPulled.has(listing._id.toString())) {
        listingsToCheck.push(listing)
        listingIdsPulled.add(listing._id.toString())
      }
      if (listing.mostRecentUpdate.getTime() > mostRecentDateProcessed.getTime()) {
        mostRecentDateProcessed = listing.mostRecentUpdate
      }
    })

    // sort in reverse order to .pop() gives the least recent listing
    listingsToCheck.sort(comparatorBuilder.objectAttributeDESC(value => value.mostRecentUpdate.getTime()))
  }


  const jobStart = new Date()

  const taskSupplier = new TaskSupplierBuilder<MarketplaceListingEntity>()
    .dataName(marketplaceListingRepository.collectionName)
    .idMapper(item => item._id.toString())
    .itemRetriever(async (limit:number) => {
      const listings = new Array<MarketplaceListingEntity>()

      for (let i = 0; i < limit; i++) {
        if (listingsToCheck.length <= 0) {
          await pullListings()
        }
        const poppedListing = listingsToCheck.pop()
        if (!poppedListing) {
          break;
        }
        listings.push(poppedListing)
      }
      
      return listings
    })
    .queueScale(5)
    .taskMapper(async item => {
      await processItem(item)
      listingIdsProcessed.add(item._id.toString())
    })
    .build();
  await taskRunner.runFor(
    TIME_TO_RUN_FOR_SECONDS,
    MAX_CONCURRENT_TASKS,
    taskSupplier,
    (err) => {
      logger.error(`Error while processing task`, err);
    }
  )

  const jobEnd = new Date()
  const jobLengthMillis = jobEnd.getTime() - jobStart.getTime()
  const jobLengthSeconds = jobLengthMillis / 1000
  const listingsPerSecond = listingIdsProcessed.size / (jobLengthSeconds)
  logger.info(`New Listings Read: ${newListingReadCount}, listings Pulled: ${listingIdsPulled.size}, listings processed: ${listingIdsProcessed.size}`)
  logger.info(`Least Recently Updated Listing Job finished, time taken: ${jobLengthMillis}ms, listings checked: ${listingIdsProcessed.size}, listings per second: ${listingsPerSecond}L/s`)
}

export const leastRecentlyUpdatedListingUpdateJobProcessor = {
  process,
}