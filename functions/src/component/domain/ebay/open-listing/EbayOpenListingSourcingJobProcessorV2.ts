import {EventContext, logger} from "firebase-functions";
import {taskRunner} from "../../../infrastructure/TaskRunner";
import {ebayOpenListingSourcer} from "./EbayOpenListingSourcer";
import {TaskSupplierBuilder} from "../../../infrastructure/TaskSupplierBuilder";
import {itemRepository} from "../../item/ItemEntity";
import {itemRetriever} from "../../item/ItemRetriever";
import {JobCallback} from "../../../jobs/ScheduledJobCreator";
import {batchArray} from "../../../tools/ArrayBatcher";
import {JSONSchemaType} from "ajv";
import {Endpoint, Method} from "../../../infrastructure/express/Endpoint";
import {BASIC_AUTH} from "../../../infrastructure/Authorization";
import {jsonValidator} from "../../../tools/JsonValidator";
import {comparatorBuilder} from "../../../infrastructure/ComparatorBuilder";
import {configRetriever} from "../../../infrastructure/ConfigRetriever";
import {queryString} from "../../../external-lib/QueryString";
import {baseExternalClient} from "../../../client/BaseExternalClient";
import {timeDifferenceCalculator, TimeUnit} from "../../../tools/TimeDifferenceCalculator";
import moment from "moment/moment";
import {ebayApiRateLimitClient} from "../api/rate-limit/EbayApiRateLimitClient";
import {ebayApiRateLimitQuerier} from "../api/rate-limit/EbayApiRateLimitQuerier";
import {EbayApi} from "../api/rate-limit/EbayApiRateLimitEntity";

const LOAD_BALANCER_TIME_TO_RUN_FOR_SECONDS = 60;
const LOAD_BALANCER_MAX_CONCURRENT_TASKS = 1;
const SOURCER_TIME_TO_RUN_FOR_SECONDS = 240;
const SOURCER_MAX_CONCURRENT_TASKS = 1;
const BATCH_SIZE = 1
const API_ROOT = "/open-listing"

interface SourceItemsRequest {
  itemIds:Array<string>
}

const sourceItemsSchema:JSONSchemaType<SourceItemsRequest> = {
  type: "object",
  properties: {
    itemIds: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
  additionalProperties: false,
  required: ["itemIds"],
}

const sourceListingsForItems = async (itemIds:Array<string>) => {
  await ebayApiRateLimitQuerier.sync()
  const items = await itemRetriever.retrieveManyByIdOrLegacyId(itemIds)

  await taskRunner.runFor(
    SOURCER_TIME_TO_RUN_FOR_SECONDS,
    SOURCER_MAX_CONCURRENT_TASKS,
    async () => {
      logger.info(`Supplying task from ${items.length} items`)
      const item = items.pop()
      if (!item) {
        logger.info(`Out of items, stopping`)
        return null
      }
      return {
        id: item._id.toString(),
        doTask: async () => {
          const itemId = item._id.toString()
          const sourcingTime = item.nextEbayOpenListingSourcingTime.toISOString()
          const currentLag = timeDifferenceCalculator.calculate({
            from: moment(item.nextEbayOpenListingSourcingTime),
            to: moment(),
            units: [TimeUnit.DAY, TimeUnit.HOUR, TimeUnit.MINUTE, TimeUnit.SECOND],
            shortLabels: true,
          })
          logger.info(`Sourcing listings for item: ${itemId}, Scheduled sourcing time is: ${sourcingTime}, current lag: ${currentLag}`)
          const result = await ebayOpenListingSourcer.sourceForItem(item)
          logger.info(`Sourced listings for item: ${itemId}, Created: ${result.listingsCreated}, Updated: ${result.listingsUpdated}, Found: ${result.listingsFound}`, result)
        },
      }
    },
    (err) => {
      logger.error(`Error while processing task`, err);
    }
  )

  await ebayApiRateLimitQuerier.flush()
}

const sendBatch = async (itemIds:Array<string>, options?:{local?:boolean}) => {
  logger.info(`Sending batch [${itemIds.join(", ")}]`)

  if (options?.local) {
    await sourceListingsForItems(itemIds)
    return
  }

  const config = configRetriever.retrieve();
  const query = queryString.stringify({ basicAuth: config.basicAuthKey() });
  const url = `https://pokeprice-source-ebay-listings-xes7awarja-nw.a.run.app${ENDPOINT_PATH}?${query}`;
  await baseExternalClient.post<any>(url, null, {itemIds});
  logger.info(`Sent batch [${itemIds.join(", ")}]`)
}

export const doLoadingBalancingJob = async (options?:{local?:boolean, timeToRunSeconds?:number, maxTasks?:number}) => {
  const taskSupplier = new TaskSupplierBuilder<Array<string>>()
    .dataName(itemRepository.collectionName)
    .idMapper(itemIds => itemIds.join("|"))
    .itemRetriever(async (limit:number) => {
      const numberOfItems = limit * BATCH_SIZE
      const items = await itemRetriever.retrieveByNextEbayOpenListingSourcingAsc(numberOfItems);
      const itemsNeedingSource = items.filter(item => moment(item.nextEbayOpenListingSourcingTime).isBefore(moment()))
      if (itemsNeedingSource.length < BATCH_SIZE) {
        return []
      }
      const itemIds = itemsNeedingSource.map(item => item._id.toString()).sort(comparatorBuilder.objectAttributeASC(val => val))
      const batchedItemIds = batchArray(itemIds, BATCH_SIZE)
      return batchedItemIds
    })
    .minItemCount(LOAD_BALANCER_MAX_CONCURRENT_TASKS)
    .taskMapper(itemIds => sendBatch(itemIds, options))
    .build();
  await taskRunner.runFor(
    options?.timeToRunSeconds ?? LOAD_BALANCER_TIME_TO_RUN_FOR_SECONDS,
    options?.maxTasks ?? LOAD_BALANCER_MAX_CONCURRENT_TASKS,
    taskSupplier,
    (err) => {
      logger.error(`Error while processing task`, err);
    }
  )
}

const ENDPOINT_PATH = `${API_ROOT}/source/item`
export const SourceListingsForItems:Endpoint = {
  path: ENDPOINT_PATH,
  method: Method.POST,
  auth: BASIC_AUTH,
  requestHandler: async (req, res, next) => {
    const request = jsonValidator.validate(req.body, sourceItemsSchema);

    await sourceListingsForItems(request.itemIds)
    return {}
  },
}

export const EbayOpenListingSourcingJobV2:JobCallback = async (context:EventContext|null) => {
  logger.info("Starting ebay open listing sourcing v2 job");
  await doLoadingBalancingJob();
  logger.info("Finished open listing sourcing v2 job")
  return Promise.resolve();
}

export const ebayOpenListingSourcingJobProcessorV2 = {
  doLoadingBalancingJob,
}
