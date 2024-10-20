import {JobCallback} from "./ScheduledJobCreator";
import {EventContext, logger} from "firebase-functions";
import {ebaySearchParamReconcileJobProcessor} from "../domain/ebay/search-param/EbaySearchParamReconcileJobProcessor";
import {cardSelectionReconcileJobProcessor} from "../domain/stats/card-v2/CardSelectionReconcileJobProcessor";


export const CardSelectionReconcileJob:JobCallback = async (context:EventContext|null) => {
  logger.info("Starting card selection reconcile job");
  await cardSelectionReconcileJobProcessor.process();
  logger.info("Finished card selection reconcile job")
  return Promise.resolve();
}