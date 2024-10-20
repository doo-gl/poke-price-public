import {END_TIME_SEARCH_TAG_KEY, END_TIME_TAG_VALUE} from "../EbayListingTagExtractor";
import moment from "moment";
import {fromTag, toTag} from "../../search-tag/SearchTagEntity";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";
import {MarketplaceListingEntity, marketplaceListingRepository} from "../MarketplaceListingEntity";
import {ebayOpenListingRetriever} from "../../ebay/open-listing/EbayOpenListingRetriever";
import {toInputValueMap} from "../../../tools/MapBuilder";
import {itemRetriever} from "../../item/ItemRetriever";
import {legacyIdOrFallback} from "../../item/ItemEntity";
import {ebayToMarketplaceListingConverter} from "../EbayToMarketplaceListingConverter";
import {Conversion, marketplaceListingUpserter} from "../MarketplaceListingUpserter";
import {EventContext, logger} from "firebase-functions";
import {taskRunner} from "../../../infrastructure/TaskRunner";
import {uuid} from "../../../external-lib/Uuid";
import {JobCallback} from "../../../jobs/ScheduledJobCreator";
import {cardPokePriceCalculationJobProcessor} from "../../stats/card-v2/CardPokePriceCalculationJobProcessor";
import {currencyExchanger} from "../../money/CurrencyExchanger";


const mapTagToTimeBounds = (tag:string):{from:Date, to:Date}|null => {
  const searchTag = fromTag(tag)
  if (searchTag.value === END_TIME_TAG_VALUE.LESS_THAN_24_HOURS) {
    return {
      from: moment().toDate(),
      to: moment().add(24, 'hour').toDate(),
    }
  }
  if (searchTag.value === END_TIME_TAG_VALUE.LESS_THAN_12_HOURS) {
    return {
      from: moment().toDate(),
      to: moment().add(12, 'hour').toDate(),
    }
  }
  if (searchTag.value === END_TIME_TAG_VALUE.LESS_THAN_8_HOURS) {
    return {
      from: moment().toDate(),
      to: moment().add(8, 'hour').toDate(),
    }
  }
  if (searchTag.value === END_TIME_TAG_VALUE.LESS_THAN_4_HOURS) {
    return {
      from: moment().toDate(),
      to: moment().add(4, 'hour').toDate(),
    }
  }
  if (searchTag.value === END_TIME_TAG_VALUE.LESS_THAN_1_HOUR) {
    return {
      from: moment().toDate(),
      to: moment().add(1, 'hour').toDate(),
    }
  }
  return null
}

const findListings = (tag:string, timeBounds:{from:Date, to:Date}):Promise<Array<MarketplaceListingEntity>> => {
  return marketplaceListingRepository.getMany(
    {
      $and: [
        {listingEndsAt: {$gte: timeBounds.from}},
        {listingEndsAt: {$lt: timeBounds.to}},
        {tags: {$nin: [tag]}},
      ],
    },
    {limit: 100, sort: [['listingEndsAt', "desc"]]}
  )
}

const updateListings = async (listings:Array<MarketplaceListingEntity>):Promise<{numberUpdated:number}> => {
  logger.info(`Updating ${listings.length} Marketplace Listings`)

  const ebayListings = await ebayOpenListingRetriever.retrieveByIds(listings.map(li => li.listingId))
  const ebayListingIdToEbayListing = toInputValueMap(ebayListings, li => li.id)

  const items = await itemRetriever.retrieveManyByIdOrLegacyId(listings.map(li => li.itemId))
  const itemIdToItem = toInputValueMap(items, it => legacyIdOrFallback(it))

  const exchangers = await currencyExchanger.buildExchangers(ebayListings.map(listing => listing.mostRecentPrice.currencyCode))
  const listingCurrencyCodeToExchanger = toInputValueMap(exchangers, ex => ex.toCurrencyCode())

  const conversions:Array<Conversion> = []
  listings.forEach(listing => {
    const ebayListing = ebayListingIdToEbayListing.get(listing.listingId)
    if (!ebayListing) {
      logger.info(`Failed to find ebay listing for id: ${listing.listingId}, on marketplace listing: ${listing._id.toString()}`)
      return
    }
    const item = itemIdToItem.get(listing.itemId)
    if (!item) {
      logger.info(`Failed to find item for id: ${listing.itemId}, on marketplace listing: ${listing._id.toString()}`)
      return;
    }
    const exchanger = listingCurrencyCodeToExchanger.get(ebayListing.mostRecentPrice.currencyCode)
    if (!exchanger) {
      logger.info(`Failed to find exchanger for currency: ${ebayListing.mostRecentPrice.currencyCode}, on marketplace listing: ${listing._id.toString()}`)
      return;
    }
    // logger.info(`Updating Marketplace Listing: ${listing._id.toString()}`)
    try {
      const conversion = ebayToMarketplaceListingConverter.convert(item, ebayListing, listing, exchanger)
      conversions.push(conversion)
    } catch (err:any) {
      logger.error(`Error while converting listing: ${listing._id.toString()}, ${err.message}`, err)
    }

  })
  await marketplaceListingUpserter.upsertForConversions(conversions);
  return {
    numberUpdated: conversions.length,
  }
}

const tagsToSearchFor = ():Array<string> => {
  return [
    toTag({key: END_TIME_SEARCH_TAG_KEY, value: END_TIME_TAG_VALUE.LESS_THAN_1_HOUR, keyLabel: null, valueLabel: null}),
    toTag({key: END_TIME_SEARCH_TAG_KEY, value: END_TIME_TAG_VALUE.LESS_THAN_4_HOURS, keyLabel: null, valueLabel: null}),
    toTag({key: END_TIME_SEARCH_TAG_KEY, value: END_TIME_TAG_VALUE.LESS_THAN_8_HOURS, keyLabel: null, valueLabel: null}),
    toTag({key: END_TIME_SEARCH_TAG_KEY, value: END_TIME_TAG_VALUE.LESS_THAN_12_HOURS, keyLabel: null, valueLabel: null}),
    toTag({key: END_TIME_SEARCH_TAG_KEY, value: END_TIME_TAG_VALUE.LESS_THAN_24_HOURS, keyLabel: null, valueLabel: null}),
  ]
}

const update = async ():Promise<{numberUpdated:number}> => {
  const queue = new ConcurrentPromiseQueue({maxNumberOfConcurrentPromises: 1})
  let totalUpdated = 0
  await Promise.all(tagsToSearchFor().map(tag => queue.addPromise(async () => {
    const timeBounds = mapTagToTimeBounds(tag)
    if (!timeBounds) {
      logger.info(`Failed to find time bounds for tag: ${tag}`)
      return
    }
    const listingsWithoutTag = await findListings(tag, timeBounds)
    totalUpdated = totalUpdated += (await updateListings(listingsWithoutTag)).numberUpdated
  })))
  return {
    numberUpdated: totalUpdated,
  }
}

const runJob = async () => {

  let lastUpdateCount:any = null

  await taskRunner.runFor(
    240,
    1,
    async () => {

      if (lastUpdateCount !== null && lastUpdateCount < 10) {
        return null
      }

      return {
        id: uuid(),
        doTask: async () => {
          const result = await marketListingEndTimeUpdater.update()
          lastUpdateCount = result.numberUpdated
        },
      }
    },
    (err) => {
      logger.error(`Error while processing task`, err);
    }
  )
}

export const marketListingEndTimeUpdater = {
  update,
  runJob,
}

export const MarketListingEndTimeUpdateJob:JobCallback = async (context:EventContext|null) => {
  logger.info("Starting market listing end time update job");
  await marketListingEndTimeUpdater.runJob();
  logger.info("Finished market listing end time update job")
  return Promise.resolve();
}