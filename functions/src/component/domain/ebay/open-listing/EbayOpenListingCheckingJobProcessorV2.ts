import {EventContext, logger} from "firebase-functions";
import {taskRunner} from "../../../infrastructure/TaskRunner";
import moment from "moment/moment";
import {timestampToMoment} from "../../../tools/TimeConverter";
import {ebayOpenListingRetriever} from "./EbayOpenListingRetriever";
import {TaskSupplierBuilder} from "../../../infrastructure/TaskSupplierBuilder";
import {ebayOpenListingRepository} from "./EbayOpenListingRepository";
import {ebayOpenListingChecker} from "./EbayOpenListingChecker";
import {timeDifferenceCalculator, TimeUnit} from "../../../tools/TimeDifferenceCalculator";
import {JSONSchemaType} from "ajv";
import {configRetriever} from "../../../infrastructure/ConfigRetriever";
import {queryString} from "../../../external-lib/QueryString";
import {baseExternalClient} from "../../../client/BaseExternalClient";
import {comparatorBuilder} from "../../../infrastructure/ComparatorBuilder";
import {batchArray} from "../../../tools/ArrayBatcher";
import {Endpoint, Method} from "../../../infrastructure/express/Endpoint";
import {BASIC_AUTH} from "../../../infrastructure/Authorization";
import {jsonValidator} from "../../../tools/JsonValidator";
import {JobCallback} from "../../../jobs/ScheduledJobCreator";
import {flattenArray} from "../../../tools/ArrayFlattener";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";
import {EbayOpenListingEntity} from "./EbayOpenListingEntity";

const LOAD_BALANCER_TIME_TO_RUN_FOR_SECONDS = 60;
const LOAD_BALANCER_MAX_CONCURRENT_TASKS = 1;
// const LOAD_BALANCER_MAX_CONCURRENT_TASKS = 2;
const CHECKER_TIME_TO_RUN_FOR_SECONDS = 240;
const CHECKER_MAX_CONCURRENT_TASKS = 1;
// const CHECKER_MAX_CONCURRENT_TASKS = 40;
const LOAD_BALANCER_BATCH_SIZE = 1
// const LOAD_BALANCER_BATCH_SIZE = 40
const API_ROOT = "/open-listing"

interface CheckListingsRequest {
  listingIds:Array<string>
}

const checkListingsSchema:JSONSchemaType<CheckListingsRequest> = {
  type: "object",
  properties: {
    listingIds: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
  additionalProperties: false,
  required: ["listingIds"],
}

const checkListings = async (listingIds:Array<string>) => {
  const queue = new ConcurrentPromiseQueue<any>({maxNumberOfConcurrentPromises: 1})
  const batchedListingIds = batchArray(listingIds, 10)
  const listings:Array<EbayOpenListingEntity> = flattenArray(await Promise.all(
    batchedListingIds.map((idBatch:Array<string>) => queue.addPromise(() => ebayOpenListingRetriever.retrieveByIds(idBatch)))
  ))
  const checkerMaxConcurrentTasks = Number(configRetriever.retrieveParamOrFallback('CHECKER_MAX_CONCURRENT_TASKS', CHECKER_MAX_CONCURRENT_TASKS.toString()))

  await taskRunner.runFor(
    CHECKER_TIME_TO_RUN_FOR_SECONDS,
    checkerMaxConcurrentTasks,
    async () => {
      // logger.info(`Supplying task from ${listings.length} listings`)
      const listing = listings.pop()
      if (!listing) {
        // logger.info(`Out of listings, stopping`)
        return null
      }
      return {
        id: listing.id,
        doTask: async () => {
          const listingId = listing.id
          const lastImported = listing.mostRecentUpdate.toDate().toISOString()
          const nextCheck = listing.nextCheckTimestamp.toDate().toISOString()
          const currentLag = timeDifferenceCalculator.calculate({
            from: timestampToMoment(listing.nextCheckTimestamp),
            to: moment(),
            units: [TimeUnit.DAY, TimeUnit.HOUR, TimeUnit.MINUTE, TimeUnit.SECOND],
            shortLabels: true,
          })
          if (timestampToMoment(listing.nextCheckTimestamp).isAfter(moment().add(1, 'hour'))) {
            logger.info(`Checking data for listing: ${listingId}, last imported: ${lastImported}, next check: ${nextCheck}, current lag: ${currentLag} - SKIPPING`)
            return;
          }
          logger.info(`Checking data for listing: ${listingId}, last imported: ${lastImported}, next check: ${nextCheck}, current lag: ${currentLag}`)
          const start = new Date()
          await ebayOpenListingChecker.checkFromListing(listing);
          const end = new Date()
          logger.info(`Checked data for listing: ${listingId}, time taken: ${end.getTime() - start.getTime()}ms`);
        },
      }
    },
    (err) => {
      logger.error(`Error while processing task`, err);
    }
  )
}

const sendBatch = async (listingIds:Array<string>) => {
  // logger.info(`Sending batch [${listingIds.join(", ")}]`)
  const config = configRetriever.retrieve();
  const query = queryString.stringify({ basicAuth: config.basicAuthKey() });
  const url = `https://pokeprice-check-ebay-listings-xes7awarja-nw.a.run.app${ENDPOINT_PATH}?${query}`;
  // const url = `https://ebaylisting-checklistings-xes7awarja-uc.a.run.app${ENDPOINT_PATH}?${query}`;
  await baseExternalClient.post<any>(url, null, {listingIds});
  // logger.info(`Sent batch [${listingIds.join(", ")}]`)
}

export const doLoadingBalancingJob = async () => {
  const loadBalancerMaxConcurrentTasks = Number(configRetriever.retrieveParamOrFallback('LOAD_BALANCER_MAX_CONCURRENT_TASKS', LOAD_BALANCER_MAX_CONCURRENT_TASKS.toString()))
  const loadBalancerBatchSize = Number(configRetriever.retrieveParamOrFallback('LOAD_BALANCER_BATCH_SIZE', LOAD_BALANCER_BATCH_SIZE.toString()))

  let totalListingsChecked = 0

  const taskSupplier = new TaskSupplierBuilder<Array<string>>()
    .dataName(ebayOpenListingRepository.collectionName)
    .idMapper(listingIds => listingIds.join("|"))
    .itemRetriever(async (limit:number) => {
      const numberOfListings = limit * loadBalancerBatchSize
      const listings = await ebayOpenListingRetriever.retrieveOpenByNextCheckTimeASC(numberOfListings);
      const listingsNeedingCheck = listings.filter(listing => timestampToMoment(listing.nextCheckTimestamp).isBefore(moment()))
      if (listingsNeedingCheck.length < loadBalancerBatchSize) {
        return []
      }
      const listingIds = listingsNeedingCheck.map(listing => listing.id).sort(comparatorBuilder.objectAttributeASC(val => val))
      const batchedListingIds = batchArray(listingIds, loadBalancerBatchSize)
      return batchedListingIds
    })
    .minItemCount(loadBalancerMaxConcurrentTasks)
    .taskMapper(async listingIds => {
      await sendBatch(listingIds)
      totalListingsChecked += listingIds.length
    })
    .build();

  const jobStart = new Date()

  await taskRunner.runFor(
    LOAD_BALANCER_TIME_TO_RUN_FOR_SECONDS,
    loadBalancerMaxConcurrentTasks,
    taskSupplier,
    (err) => {
      logger.error(`Error while processing task`, err);
    }
  )

  const jobEnd = new Date()
  const jobLengthMillis = jobEnd.getTime() - jobStart.getTime()
  const jobLengthSeconds = jobLengthMillis / 1000
  const listingsPerSecond = totalListingsChecked / (jobLengthSeconds)
  logger.info(`Checking Load Balancer Job finished, time taken: ${jobLengthMillis}ms, listings checked: ${totalListingsChecked}, listings per second: ${listingsPerSecond}L/s`)
}

const ENDPOINT_PATH = `${API_ROOT}/check/listing`
export const CheckListings:Endpoint = {
  path: ENDPOINT_PATH,
  method: Method.POST,
  auth: BASIC_AUTH,
  requestHandler: async (req, res, next) => {
    const request = jsonValidator.validate(req.body, checkListingsSchema);

    await checkListings(request.listingIds)
    return {}
  },
}

export const EbayOpenListingCheckingJobV2:JobCallback = async (context:EventContext|null) => {
  logger.info("Starting ebay open listing checking v2 job");
  await doLoadingBalancingJob();
  logger.info("Finished open listing checking v2 job")
  return Promise.resolve();
}