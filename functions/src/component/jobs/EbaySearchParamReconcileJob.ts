import {JobCallback} from "./ScheduledJobCreator";
import {EventContext, logger} from "firebase-functions";
import {ebaySearchParamReconcileJobProcessor} from "../domain/ebay/search-param/EbaySearchParamReconcileJobProcessor";


export const EbaySearchParamReconcileJob:JobCallback = async (context:EventContext|null) => {
  logger.info("Starting ebay search param reconcile job");
  await ebaySearchParamReconcileJobProcessor.process();
  logger.info("Finished ebay search param reconcile job")
  return Promise.resolve();
}