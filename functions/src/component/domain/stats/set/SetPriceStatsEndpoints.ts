import {Endpoint, Method} from "../../../infrastructure/express/Endpoint";
import {BASIC_AUTH} from "../../../infrastructure/Authorization";
import {nonNullString, readParam} from "../../../tools/QueryParamReader";
import {NotFoundError} from "../../../error/NotFoundError";
import {setRetriever} from "../../set/SetRetriever";
import {setPriceStatsRetriever} from "./SetPriceStatsRetriever";
import {setPriceStatsSourcer} from "./SetPriceStatsSourcer";
import {setPriceStatsRecalculator} from "./SetPriceStatsRecalculator";


export const RecalculateForSet:Endpoint = {
  path: '',
  method: Method.GET,
  auth: BASIC_AUTH,
  requestHandler: async (req, res, next) => {
    const setId = readParam<string>(req.query, 'setId', nonNullString())
    const set = await setRetriever.retrieve(setId)
    const stats = await setPriceStatsRetriever.retrieveStatsForSet(set.id);
    if (!stats) {
      throw new NotFoundError(`No stats found for set with id: ${set.id}`);
    }
    const newStats = await setPriceStatsRecalculator.recalculateStats(stats)
    return {
      stats: newStats,
    }
  },
}

export const SourceSetStats:Endpoint = {
  path: '',
  method: Method.GET,
  auth: BASIC_AUTH,
  requestHandler: async (req, res, next) => {
    const stats = await setPriceStatsSourcer.source()
    return {
      stats,
    }
  },
}