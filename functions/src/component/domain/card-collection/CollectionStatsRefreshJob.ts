import {JobCallback} from "../../jobs/ScheduledJobCreator";
import {EventContext, logger} from "firebase-functions";
import {collectionStatsUpdater} from "./CollectionStatsUpdater";
import {cardCollectionRetriever} from "./CardCollectionRetriever";
import moment from "moment";
import {timestampToMoment} from "../../tools/TimeConverter";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";


const doRefresh = async () => {

  const cutoff = moment().subtract(5, 'days')
  const collections = await cardCollectionRetriever.retrieveByStatsLastUpdatedAsc(1);
  const nextCollectionsToUpdate = collections.filter(col => {
    const shouldProcess = timestampToMoment(col.statsV2.lastUpdatedAt).isSameOrBefore(cutoff)
    if (!shouldProcess) {
      logger.info(`Collection: ${col.id} last updated: ${col.statsV2.lastUpdatedAt.toDate().toISOString()} which is after the cutoff: ${cutoff.toISOString()} - skipping`)
    }
    return shouldProcess
  })
  if (nextCollectionsToUpdate.length === 0) {
    return
  }
  const queue = new ConcurrentPromiseQueue({maxNumberOfConcurrentPromises: 1})
  await Promise.all(nextCollectionsToUpdate.map(col => queue.addPromise(async () => {
    logger.info(`Updating collection: ${col.id} with parent: ${col.parentCollectionId}, last updated: ${col.statsV2.lastUpdatedAt.toDate().toISOString()}`)
    await collectionStatsUpdater.update(col.id)
  })))


}

export const CollectionStatsRefreshJob:JobCallback = async (context:EventContext|null) => {
  logger.info("Starting collection stats refresh job");
  await doRefresh();
  logger.info("Finished collection stats refresh job")
  return Promise.resolve();
}