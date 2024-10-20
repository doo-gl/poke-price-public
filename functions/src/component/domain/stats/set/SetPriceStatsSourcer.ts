import {SetPriceStatsEntity} from "./SetPriceStatsEntity";
import {setRetriever} from "../../set/SetRetriever";
import {SetEntity} from "../../set/SetEntity";
import {setPriceStatsRetriever} from "./SetPriceStatsRetriever";
import {toSet} from "../../../tools/SetBuilder";
import {difference} from "../../../tools/SetOperations";
import {Create} from "../../../database/Entity";
import {setPriceStatsCalculator, SetStats} from "./SetPriceStatsCalculator";
import {momentToTimestamp} from "../../../tools/TimeConverter";
import {setPriceStatsCreator} from "./SetPriceStatsCreator";
import {toInputValueMap} from "../../../tools/MapBuilder";
import {removeNulls} from "../../../tools/ArrayNullRemover";
import {handleAllErrors} from "../../../tools/AllPromiseHandler";
import {logger} from "firebase-functions";
import {ConcurrentPromiseQueue} from "../../../tools/ConcurrentPromiseQueue";
import {TimestampStatic} from "../../../external-lib/Firebase";

const tryCreateStats = async (set:SetEntity):Promise<SetPriceStatsEntity|null> => {
  const setStats:SetStats|null = await setPriceStatsCalculator.calculateForSet(set);
  if (!setStats) {
    return null;
  }
  const createStats:Create<SetPriceStatsEntity> = {
    series: set.series,
    set: set.name,
    setId: set.id,
    lastCalculationTime: TimestampStatic.now(),
    mostRecentPrice: momentToTimestamp(setStats.mostRecentPrice),
    totalSetPokePrice: setStats.totalSetPokePrice,
  }
  const createdStats = await setPriceStatsCreator.create(createStats);
  return createdStats;
}

const source = async ():Promise<Array<SetPriceStatsEntity>> => {
  const sets:Array<SetEntity> = await setRetriever.retrieveAll();
  const allSetIds:Set<string> = toSet(sets, set => set.id);
  const setStats:Array<SetPriceStatsEntity> = await setPriceStatsRetriever.retrieveAll();
  const setIdsWithStats:Set<string> = toSet(setStats, setStat => setStat.setId);
  const setIdsWithoutStats:Set<string> = difference(allSetIds, setIdsWithStats);
  const setIdToSet:Map<string, SetEntity> = toInputValueMap(sets, set => set.id);

  const promiseQueue = new ConcurrentPromiseQueue<SetPriceStatsEntity|null>(5);
  const tryCreateStatPromises:Array<Promise<SetPriceStatsEntity|null>> = [];

  setIdsWithoutStats.forEach((setIdWithoutStats:string) => {
    const set = setIdToSet.get(setIdWithoutStats);
    if (!set) {
      return;
    }
    const queuedCreatePromise = promiseQueue.addPromise(() => tryCreateStats(set))
    tryCreateStatPromises.push(queuedCreatePromise);
  });
  const createdSetStats:Array<SetPriceStatsEntity> = removeNulls(await handleAllErrors(
    tryCreateStatPromises,
    'Failed to create stats for set',
  ))
  logger.info(`Created ${createdSetStats.length} stat entities for sets.`)
  return createdSetStats;
}

export const setPriceStatsSourcer = {
  source,
  tryCreateStats,
}