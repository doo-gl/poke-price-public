import {SetPriceStatsEntity} from "./SetPriceStatsEntity";
import moment from "moment";
import {setPriceStatsRetriever} from "./SetPriceStatsRetriever";
import {logger} from "firebase-functions";
import {removeNulls} from "../../../tools/ArrayNullRemover";
import {handleAllErrors} from "../../../tools/AllPromiseHandler";
import {setPriceStatsCalculator, SetStats} from "./SetPriceStatsCalculator";
import {SetEntity} from "../../set/SetEntity";
import {setRetriever} from "../../set/SetRetriever";
import {Update} from "../../../database/Entity";
import {setUpdater} from "../../set/SetUpdater";
import {setPriceStatsUpdater} from "./SetPriceStatsUpdater";
import {momentToTimestamp} from "../../../tools/TimeConverter";
import {TimestampStatic} from "../../../external-lib/Firebase";


const MAX_RECALCULATIONS = 4;
const DURATION_STATS_ARE_VALID_FOR_IN_HOURS = 12;

const findSetsThatNeedRecalculation = ():Promise<Array<SetPriceStatsEntity>> => {
  const now = moment();
  const timeAtWhichStatsExpired = now.subtract(DURATION_STATS_ARE_VALID_FOR_IN_HOURS, 'hours');
  return setPriceStatsRetriever.retrieveStatsUpdatedBefore(
    timeAtWhichStatsExpired,
    MAX_RECALCULATIONS,
  );
}

const updateLastCalculationTime = (statsId:string):Promise<SetPriceStatsEntity> => {
  const update:Update<SetPriceStatsEntity> = {
    lastCalculationTime: TimestampStatic.now(),
  }
  return setPriceStatsUpdater.update(statsId, update);
}

const updateStats = (statsId:string, newStats:SetStats):Promise<SetPriceStatsEntity> => {
  const update:Update<SetPriceStatsEntity> = {
    lastCalculationTime: TimestampStatic.now(),
    totalSetPokePrice: newStats.totalSetPokePrice,
    mostRecentPrice: momentToTimestamp(newStats.mostRecentPrice),
  }
  return setPriceStatsUpdater.update(statsId, update);
}

const updateSet = async (setId:string, newStats:SetStats):Promise<SetEntity> => {
  const update:Update<SetEntity> = {
    pokePrice: {
      price: newStats.totalSetPokePrice,
    },
  }
  return setUpdater.update(setId, update);
}

const recalculateStats = async (stats:SetPriceStatsEntity):Promise<SetPriceStatsEntity> => {
  const set:SetEntity = await setRetriever.retrieve(stats.setId);
  const newStats:SetStats|null = await setPriceStatsCalculator.calculateForSet(set);
  if (!newStats) {
    logger.info(`No new stats for set with id: ${set.id}`);
    return updateLastCalculationTime(stats.id);
  }

  const updatedStats = await updateStats(stats.id, newStats);
  const updatedSet = await updateSet(set.id, newStats);

  return updatedStats;
}

const recalculate = async () => {
  const setsToRecalculate:Array<SetPriceStatsEntity> = await findSetsThatNeedRecalculation();
  logger.info(`Recalculating stats for ${setsToRecalculate.length} sets, set price stats ids: ${setsToRecalculate.map(stats => stats.id).join(',')}`);
  const recalculatedStats:Array<SetPriceStatsEntity> = removeNulls(await handleAllErrors(
    setsToRecalculate.map(stats => recalculateStats(stats)),
    'Failed to recalculate stats',
  ));
  logger.info(`Recalculated stats for ${recalculatedStats.length} sets, set price stats ids: ${recalculatedStats.map(stats => stats.id).join(',')}`);
  return recalculatedStats;
}

export const setPriceStatsRecalculator = {
  recalculateStats,
  recalculate,
}