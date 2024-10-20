import {JobCallback} from "../../../../jobs/ScheduledJobCreator";
import {EventContext, logger} from "firebase-functions";
import {ebayOpenListingRepository} from "../EbayOpenListingRepository";
import {uuid} from "../../../../external-lib/Uuid";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";
import {openListingPageChecker, ResultType} from "../../card-price/open-listing-retrieval/OpenListingPageChecker";
import {ListingType} from "../EbayOpenListingEntity";

const LIMIT = 30

const checkOpen = async () => {

  const id = uuid()

  const openListings = await ebayOpenListingRepository.getMany(
    [],
    {
      limit: LIMIT,
      startAfterId: id,
    }
  )

  const queue = new ConcurrentPromiseQueue({maxNumberOfConcurrentPromises: 1})

  let countMissingOrUnknown = 0
  let score = 0
  let errorCount = 0

  const results = new Array<any>()

  await Promise.all(openListings.map(openListing => queue.addPromise(async () => {
    const listingUrl = openListing.listingUrl
    logger.info(`Checking listing: ${openListing.id} - ${openListing.listingUrl}`)
    try {
      const openListingResult = await openListingPageChecker.check(listingUrl)


      if (openListingResult.resultType === ResultType.LISTING_IS_MISSING) {
        countMissingOrUnknown++
        return
      }
      if (openListingResult.resultType === ResultType.UNKNOWN) {
        countMissingOrUnknown++
      }

      if (openListingResult.listingName === null) {
        logger.warn(`Listing: ${listingUrl} is missing listing name`)
        score += 100
      }
      if (!openListingResult.listingSpecifics || Object.keys(openListingResult.listingSpecifics).length === 0) {
        logger.warn(`Listing: ${listingUrl} is missing listing specifics`)
        score += 100
      }
      if (openListingResult.price === null) {
        logger.warn(`Listing: ${listingUrl} is missing listing price`)
        score += 100
      }

      if (openListingResult.resultType === ResultType.LIVE) {
        if (!openListingResult.imageUrls || openListingResult.imageUrls.length === 0) {
          logger.warn(`Listing: ${listingUrl} is missing listing images`)
          score += 100
        }
        if (!openListingResult.listingTypes || openListingResult.listingTypes.length === 0) {
          logger.warn(`Listing: ${listingUrl} is missing listing types`)
          score += 100
        }
        if (openListingResult.bidCount === null && openListingResult.listingTypes?.some(type => type === ListingType.BID)) {
          logger.warn(`Listing: ${listingUrl} is missing listing bid count`)
          score += 100
        }
        if (openListingResult.buyItNowPrice === null && openListingResult.listingTypes?.some(type => type === ListingType.BUY_IT_NOW)) {
          logger.warn(`Listing: ${listingUrl} is missing listing buy it now price`)
          score += 100
        }
        if (openListingResult.listingTypes?.some(type => type === ListingType.BID) && !openListingResult.endedTimestamp) {
          logger.warn(`Listing: ${listingUrl} is missing bid but missing end timestamp`)
          score += 100
        }
      } else if (openListingResult.resultType === ResultType.ENDED_WITH_SALE) {
        if (openListingResult.endedTimestamp === null) {
          logger.warn(`Listing: ${listingUrl} is missing listing end timestamp`)
          score += 100
        }
      }

      results.push({
        openListing,
        openListingResult,
      })
    } catch (err:any) {
      logger.error(`Failed to check listing: ${listingUrl}, ${err.message}`, err)
      errorCount++
    }

  })))

  if (score > 1000) {
    logger.error(`ALERT - Ebay parsing likely broken - Checked ${LIMIT} listings and got a score of ${score}`, {score, errorCount, countMissingOrUnknown})
  }
  if (countMissingOrUnknown > 10) {
    logger.error(`ALERT - Ebay parsing likely broken - Checked ${LIMIT} listings and ${countMissingOrUnknown} are missing or unknown`, {score, errorCount, countMissingOrUnknown})
  }
  if (errorCount > 5) {
    logger.error(`ALERT - Ebay parsing likely broken - Checked ${LIMIT} listings and ${errorCount} errored`, {score, errorCount, countMissingOrUnknown})
  }


  return
}



const check = async () => {

  await checkOpen()

}

export const ebayParsingBrokenChecker = {
  check,
}

export const EbayParsingBrokenDetectionJob:JobCallback = async (context:EventContext|null) => {
  logger.info("Starting ebay parsing broken detection job");
  // await ebayParsingBrokenChecker.check();
  logger.info("Finished ebay parsing broken detection job")
  return Promise.resolve();
}