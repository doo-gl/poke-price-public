import {logger} from "firebase-functions";
import {taskRunner} from "../../../infrastructure/TaskRunner";
import moment from "moment/moment";
import {timestampToMoment} from "../../../tools/TimeConverter";
import {EbayOpenListingEntity} from "./EbayOpenListingEntity";
import {ebayOpenListingRetriever} from "./EbayOpenListingRetriever";
import {TaskSupplierBuilder} from "../../../infrastructure/TaskSupplierBuilder";
import {ebayOpenListingRepository} from "./EbayOpenListingRepository";
import {ebayOpenListingChecker} from "./EbayOpenListingChecker";
import {timeDifferenceCalculator, TimeUnit} from "../../../tools/TimeDifferenceCalculator";

// todo
// update this to bundle up checks and to offload them to another function
// this job reads through the listings in next check order, bundles them together into batches of say, 50
// then sends that batch into an event
// then have a trigger listening to that event to process the batch of listing IDs


const TIME_TO_RUN_FOR_SECONDS = 240;

const processOpenListing = async (listing:EbayOpenListingEntity) => {
  const listingId = listing.id
  const lastImported = listing.mostRecentUpdate.toDate().toISOString()
  const nextCheck = listing.nextCheckTimestamp.toDate().toISOString()
  const currentLag = timeDifferenceCalculator.calculate({
    from: timestampToMoment(listing.nextCheckTimestamp),
    to: moment(),
    units: [TimeUnit.DAY, TimeUnit.HOUR, TimeUnit.MINUTE, TimeUnit.SECOND],
    shortLabels: true,
  })
  logger.info(`Checking data for listing: ${listingId}, last imported: ${lastImported}, next check: ${nextCheck}, current lag: ${currentLag}`)
  const start = new Date()
  await ebayOpenListingChecker.checkFromListing(listing);
  const end = new Date()
  logger.info(`Checked data for listing: ${listingId}, time taken: ${end.getTime() - start.getTime()}ms`);
}

const process = async () => {

  const nextListing = await ebayOpenListingRetriever.retrieveOpenByNextCheckTimeASC(1);
  if (nextListing.length === 0) {
    logger.info(`No open listings, skipping`);
    return;
  }
  const nextCheckTimestamp = timestampToMoment(nextListing[0].nextCheckTimestamp);
  const concurrency = 60;
  // logger.info(`Next check timestamp is ${nextCheckTimestamp.toISOString()}, so concurrency level has been set at ${concurrency}`);
  const taskSupplier = new TaskSupplierBuilder<EbayOpenListingEntity>()
    .dataName(ebayOpenListingRepository.collectionName)
    .idMapper(item => item.id)
    .itemRetriever(async (limit:number) => {
      const listings = await ebayOpenListingRetriever.retrieveOpenByNextCheckTimeASC(limit);
      return listings.filter(listing => {
        const isTooEarlyToCheck = timestampToMoment(listing.nextCheckTimestamp).isAfter(moment());
        if (isTooEarlyToCheck) {
          logger.info(`Next listing to check: ${listing.id}, is due at ${listing.nextCheckTimestamp.toDate().toISOString()}`)
        }
        return !isTooEarlyToCheck;
      })
    })
    .minItemCount(concurrency)
    .queueScale(4)
    .taskMapper(item => processOpenListing(item))
    .build()

  await taskRunner.runFor(
    TIME_TO_RUN_FOR_SECONDS,
    concurrency,
    taskSupplier,
    (err) => {
      logger.error(`Error while processing task`, err);
    }
  )

}

export const ebayOpenListingCheckingJobProcessor = {
  process,
}