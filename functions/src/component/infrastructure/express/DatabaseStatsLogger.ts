import {RepositoryOperationStats} from "../../database/BaseCrudRepository";
import cls from "cls-hooked";
import {RequestHandler} from "./RequestHandler";
import {logger} from "firebase-functions";
import {comparatorBuilder} from "../ComparatorBuilder";

const namespace:cls.Namespace = cls.createNamespace("database-usage-stats");
const KEY = 'REPOSITORY_STATS';
interface CollectionStats {
  collectionName:string,
  numberOfReads:number,
  numberOfWrites:number,
  numberOfDeletes:number,
}
const BY_OPERATIONS_DESC = comparatorBuilder.objectAttributeDESC<CollectionStats, number>(stats => {
  return stats.numberOfReads + stats.numberOfWrites + stats.numberOfDeletes
})
type Stats = {[collectionName:string]:CollectionStats};

const isNamespaceActive = () => {
  // @ts-ignore
  return namespace && namespace.active
}

const getDatabaseStats = ():Stats => {
  return namespace.get(KEY) || {}
}

const log = (stats:RepositoryOperationStats) => {
  if (!isNamespaceActive()) {
    return;
  }
  const currentStats:Stats = getDatabaseStats();
  const currentCollectionStats = currentStats[stats.collectionName] || { collectionName: stats.collectionName, numberOfReads: 0, numberOfWrites: 0, numberOfDeletes: 0 };
  if (stats.numberOfReads) {
    currentCollectionStats.numberOfReads += stats.numberOfReads;
  }
  if (stats.numberOfWrites) {
    currentCollectionStats.numberOfWrites += stats.numberOfWrites;
  }
  if (stats.numberOfDeletes) {
    currentCollectionStats.numberOfDeletes += stats.numberOfDeletes;
  }
  currentStats[currentCollectionStats.collectionName] = currentCollectionStats;
  namespace.set<Stats>(KEY, currentStats);
}

const logOutcome = () => {
  const stats:Stats = getDatabaseStats();
  const collectionStats:Array<CollectionStats> = Object.values(stats).sort(BY_OPERATIONS_DESC);
  const totalStats:CollectionStats = { collectionName: 'ALL', numberOfReads: 0, numberOfWrites: 0, numberOfDeletes: 0 };
  const functionName = process.env.FUNCTION_TARGET;
  collectionStats.forEach(collectionStat => {
    totalStats.numberOfReads += collectionStat.numberOfReads;
    totalStats.numberOfWrites += collectionStat.numberOfWrites;
    totalStats.numberOfDeletes += collectionStat.numberOfDeletes;
    logger.info(
      `${collectionStat.collectionName} - Reads: ${collectionStat.numberOfReads}, Writes: ${collectionStat.numberOfWrites}, Deletes: ${collectionStat.numberOfDeletes}`,
      {
        functionName,
        ...collectionStat,
      }
    );
  })

  const logPayload = {
    functionName,
    ...totalStats,
  }
  const totalOps = totalStats.numberOfReads + totalStats.numberOfWrites + totalStats.numberOfDeletes;
  if (totalOps > 10000) {
    logger.error(
      `${totalStats.collectionName} - Total: ${totalOps}, Reads: ${totalStats.numberOfReads}, Writes: ${totalStats.numberOfWrites}, Deletes: ${totalStats.numberOfDeletes}`,
      logPayload,
    )
  } else if (totalOps > 1000) {
    logger.warn(
      `${totalStats.collectionName} - Total: ${totalOps}, Reads: ${totalStats.numberOfReads}, Writes: ${totalStats.numberOfWrites}, Deletes: ${totalStats.numberOfDeletes}`,
      logPayload
    )
  } else {
    logger.info(
      `${totalStats.collectionName} - Total: ${totalOps}, Reads: ${totalStats.numberOfReads}, Writes: ${totalStats.numberOfWrites}, Deletes: ${totalStats.numberOfDeletes}`,
      logPayload
    )
  }
}

const middleware:RequestHandler = (req, res, next) => {
  namespace.run(() => {
    next();
    res.on('finish', () => logOutcome())
  });
}

const wrapper = (callback:() => Promise<void>):() => Promise<void> => {
  return () => new Promise((resolve, reject) => {
    namespace.run(() => {
      callback()
        .then(() => {
          logOutcome();
          resolve();
        })
        .catch(() => {
          logOutcome();
          reject();
        })
    })
  })
}

export const databaseStatsLogger = {
  middleware,
  wrapper,
  log,
  getDatabaseStats,
}