import {cacheRepository} from "./CacheRepository";
import {momentToTimestamp} from "../../tools/TimeConverter";
import moment from "moment";
import {SortOrder} from "../BaseCrudRepository";
import {handleAllErrors} from "../../tools/AllPromiseHandler";
import {logger} from "firebase-functions";
import {Timestamp} from "../../external-lib/Firebase";

const ENTRIES_TO_REMOVE = 500;

const remove = async ():Promise<void> => {
  const now:Timestamp = momentToTimestamp(moment())
  const expiredEntries = await cacheRepository.getMany(
    [
      { field: "dateEntryExpires", operation: "<", value: now },
    ],
    {
      sort: [ {field: "dateEntryExpires", order: SortOrder.ASC} ],
      limit: ENTRIES_TO_REMOVE,
    }
  );
  logger.info(`Found ${expiredEntries.length} cache entries that have expired`);
  const removalPromises = expiredEntries.map(entry => {
    return cacheRepository.delete(entry.id);
  });
  const deletedResults = await handleAllErrors(
    removalPromises,
    `Failed to delete some cache entries`,
  );

  logger.info(`Deleted ${deletedResults.filter(res => res).length} cache entries because they had expired`);
}

export const expiredEntryRemover = {
  remove,
}