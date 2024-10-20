import {ScheduledJob} from "./ScheduledJobCreator";
import {EventContext, logger} from "firebase-functions";
import {cacheRepository} from "../database/cache/CacheRepository";
import {TimestampStatic} from "../external-lib/Firebase";


export const debugJob:ScheduledJob = {
  cronExpression: 'every 5 minutes',
  callback: async (context:EventContext|null) => {
    logger.info("Starting debug job");
    const createdEntry = await cacheRepository.create({entryType: 'FOO', value: 'BAR', dateEntryExpires: TimestampStatic.now(), key: 'FOOBAR'})
    const retrievedEntry = await cacheRepository.getMany([ {field: "key", operation: "==", value: "FOOBAR"} ])
    const deletedEntry = await cacheRepository.delete(retrievedEntry[0].id)
    logger.info("Finished debug job")
    return Promise.resolve();
  },
}