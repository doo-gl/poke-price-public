import {entityArchiver} from "./EntityArchiver";
import {itemRetriever} from "../item/ItemRetriever";
import {ItemEntity, itemRepository, itemUpdater, legacyIdOrFallback} from "../item/ItemEntity";
import moment from "moment";
import {momentToTimestamp, timestampToMoment} from "../../tools/TimeConverter";
import {TaskSupplierBuilder} from "../../infrastructure/TaskSupplierBuilder";
import {taskRunner} from "../../infrastructure/TaskRunner";
import {EventContext, logger} from "firebase-functions";
import {HistoricalCardPriceEntity} from "../historical-card-price/HistoricalCardPriceEntity";
import {historicalCardPriceRepository} from "../historical-card-price/HistoricalCardPriceRepository";
import {JobCallback} from "../../jobs/ScheduledJobCreator";
import {EbayOpenListingEntity, ListingState} from "../ebay/open-listing/EbayOpenListingEntity";
import {ebayOpenListingRepository} from "../ebay/open-listing/EbayOpenListingRepository";
import {SortOrder} from "../../database/BaseCrudRepository";
import {dedupe} from "../../tools/ArrayDeduper";
import {uuid} from "../../external-lib/Uuid";
import {batchArray} from "../../tools/ArrayBatcher";

const MAX_PRICE_AGE_DAYS = 100
// const MAX_PRICES_TO_ARCHIVE_IN_SINGLE_BATCH = 10
const MAX_PRICES_TO_ARCHIVE_IN_SINGLE_BATCH = 500
const MAX_CONCURRENT_TASKS = 1
// const TIME_TO_RUN_FOR_SECONDS = 5
const TIME_TO_RUN_FOR_SECONDS = 240

const getCutOff = () => {
  return moment().subtract(MAX_PRICE_AGE_DAYS, "days")
}

const canArchivePrice = (price:HistoricalCardPriceEntity):boolean => {
  return timestampToMoment(price.timestamp).isBefore(getCutOff())
}

const archiveListings = async (prices:Array<HistoricalCardPriceEntity>, metadata:any) => {
  await entityArchiver.archive(historicalCardPriceRepository.collectionName, prices, metadata)
  const batches = batchArray(prices.map(price => price.id), 500)
  await Promise.all(batches.map(batch => historicalCardPriceRepository.batchDelete(batch)))

}

const retrievePricesToArchiveForCardId = async (cardId:string):Promise<Array<HistoricalCardPriceEntity>> => {
  const pricesToArchive = new Array<HistoricalCardPriceEntity>()
  await historicalCardPriceRepository.iterator()
    .queries([
      {field: "cardId", operation: "==", value: cardId},
      {field: "timestamp", operation: "<=", value: momentToTimestamp(getCutOff())},
    ])
    .iterateBatch(async prices => {
      prices.forEach(price => {
        if (!canArchivePrice(price)) {
          return
        }
        pricesToArchive.push(price)
      })
    })
  return pricesToArchive
}

const retrievePricesToArchive = async ():Promise<Array<HistoricalCardPriceEntity>> => {
  const pricesToArchive = new Array<HistoricalCardPriceEntity>()
  const cardIds = new Set<string>()
  await historicalCardPriceRepository.iterator()
    .queries([{field: "timestamp", operation: "<=", value: momentToTimestamp(getCutOff())}])
    .sort([{field: "timestamp", order: SortOrder.ASC}])
    .batchSize(1)
    .iterate(async price => {
      const cardId = price.cardId
      if (!canArchivePrice(price) || cardIds.has(cardId)) {
        return false
      }
      cardIds.add(cardId)
      const pricesForCardId = await retrievePricesToArchiveForCardId(cardId)
      pricesForCardId.forEach(priceForCardId => {
        pricesToArchive.push(priceForCardId)
      })
      return pricesToArchive.length >= MAX_PRICES_TO_ARCHIVE_IN_SINGLE_BATCH
    })

  return pricesToArchive
}

const archiveBatchOfOldPrices = async (pricesToArchive:Array<HistoricalCardPriceEntity>):Promise<void> => {

  const cardIds = dedupe(pricesToArchive.map(priceToArchive => priceToArchive.cardId), i => i)
  const items = await itemRetriever.retrieveManyByIdOrLegacyId(cardIds)
  const itemIds = dedupe(items.map(item => item._id.toString()), i => i)

  if (pricesToArchive.length > 0) {
    logger.info(`Archiving ${pricesToArchive.length} Prices for ${itemIds.length} items: ${itemIds.join(", ")}`)
    await archiveListings(pricesToArchive, {
      itemId: null,
      cardId: null,
      itemIds,
      cardIds,
    })
  } else {
    logger.info(`Found no Prices to archive`)
  }
}

const archiveBatchOfOldPricesForItem = async (item:ItemEntity):Promise<void> => {
  const pricesToArchive = await retrievePricesToArchiveForCardId(legacyIdOrFallback(item))
  if (pricesToArchive.length > 0) {
    logger.info(`Archiving ${pricesToArchive.length} Prices for item: ${item._id.toString()}`)
    await archiveListings(pricesToArchive, {
      itemId: item._id.toString(),
      cardId: legacyIdOrFallback(item),
      itemIds: [item._id.toString()],
      cardIds: [legacyIdOrFallback(item)],
    })
  }
  if (pricesToArchive.length < MAX_PRICES_TO_ARCHIVE_IN_SINGLE_BATCH) {
    await itemUpdater.updateOnly(item._id, {nextHistoricalPriceArchiveTime: moment().add(7, 'days').toDate()})
  }
}

const doArchive = async () => {



  // const taskSupplier = new TaskSupplierBuilder<void>()
  //   .dataName("ARCHIVED_PRICES")
  //   .idMapper(() => uuid())
  //   .itemRetriever(async () => [])
  //   .minItemCount(1)
  //   .taskMapper(() => archiveBatchOfOldPrices())
  //   .build();

  const testPrices = await retrievePricesToArchive()
  if (testPrices.length <= MAX_PRICES_TO_ARCHIVE_IN_SINGLE_BATCH / 2) {
    logger.info(`Found ${testPrices.length} prices to archive, not enough to run job, closing`)
    return
  }

  await taskRunner.runFor(
    TIME_TO_RUN_FOR_SECONDS,
    1,
    async () => {
      const pricesToArchive = await retrievePricesToArchive()

      if (pricesToArchive.length <= MAX_PRICES_TO_ARCHIVE_IN_SINGLE_BATCH / 2) {
        return null
      }
      return {
        id: uuid(),
        doTask: () => archiveBatchOfOldPrices(pricesToArchive),
      }
    },
    (err) => {
      logger.error(`Error while processing task`, err);
    }
  )
}

export const historicalCardPriceArchiver = {
  doArchive,
  archiveBatchOfOldPricesForItem,
}

export const HistoricalCardPriceArchiveJob:JobCallback = async (context:EventContext|null) => {
  logger.info('Starting Archive')
  await historicalCardPriceArchiver.doArchive()
  logger.info('Finished Archive')
  return Promise.resolve();
}