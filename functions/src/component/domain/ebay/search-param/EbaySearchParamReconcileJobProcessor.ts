import {logger} from "firebase-functions";
import {taskRunner} from "../../../infrastructure/TaskRunner";
import moment from "moment/moment";
import {timestampToMoment} from "../../../tools/TimeConverter";
import {TaskSupplierBuilder} from "../../../infrastructure/TaskSupplierBuilder";
import {EbayCardSearchParamEntity} from "./EbayCardSearchParamEntity";
import {ebaySearchParamPriceReconciler} from "./EbaySearchParamPriceReconciler";
import {ebayCardSearchParamRepository} from "./EbayCardSearchParamRepository";
import {ebaySearchParamRetriever} from "./EbayCardSearchParamRetriever";

const TIME_TO_RUN_FOR_SECONDS = 200;
const MAX_CONCURRENT_TASKS = 4;
const MIN_TIME_BETWEEN_RECONCILIATION_DAYS = 180;

const processSearchParam = async (searchParam:EbayCardSearchParamEntity) => {
  logger.info(`Reconciling prices for search param: ${searchParam.id}, last reconciled: ${searchParam.lastReconciled.toDate().toISOString()}`)
  // const config = configRetriever.retrieve();
  // const query = queryString.stringify({ basicAuth: config.basicAuthKey });
  // const url = `${config.apiRoot}/EBAY_SEARCH_PARAM_ReconcilePricesWithSearch/${searchParam.id}?${query}`;
  // const result = await baseExternalClient.put<ReconcileResult>(url, null, null);
  const result = await ebaySearchParamPriceReconciler.reconcile(searchParam.id);
  logger.info(`Reconciled prices for search param: ${searchParam.id}`, result);
}

const process = async () => {

  const taskSupplier = new TaskSupplierBuilder<EbayCardSearchParamEntity>()
    .dataName(ebayCardSearchParamRepository.collectionName)
    .idMapper(item => item.id)
    .itemRetriever(async (limit:number) => {
      const items = await ebaySearchParamRetriever.retrieveByLastReconciledAsc(limit);
      return items.filter(item => {
        const cutoff = moment().subtract(MIN_TIME_BETWEEN_RECONCILIATION_DAYS, 'days');
        const isTooEarlyForUpdate = timestampToMoment(item.lastReconciled).isAfter(cutoff);
        if (isTooEarlyForUpdate) {
          logger.info(`Least recently reconciled search param: ${item.id}, was updated at ${item.lastReconciled.toDate().toISOString()}, which is after the cutoff time window: ${cutoff.toISOString()}`)
        }
        return !isTooEarlyForUpdate;
      })
    })
    .minItemCount(MAX_CONCURRENT_TASKS)
    .taskMapper(item => processSearchParam(item))
    .build();
  await taskRunner.runFor(
    TIME_TO_RUN_FOR_SECONDS,
    MAX_CONCURRENT_TASKS,
    taskSupplier,
    (err) => {
      logger.error(`Error while processing task`, err);
    }
  )

}

export const ebaySearchParamReconcileJobProcessor = {
  process,
}