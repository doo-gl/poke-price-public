import {SetPriceStatsEntity} from "./SetPriceStatsEntity";
import {setPriceStatsRepository} from "./SetPriceStatsRepository";
import {singleResultRepoQuerier} from "../../../database/SingleResultRepoQuerier";
import {Moment} from "moment";
import {momentToTimestamp} from "../../../tools/TimeConverter";
import {SortOrder} from "../../../database/BaseCrudRepository";
import {byIdRetriever} from "../../../database/ByIdRetriever";


const retrieveAll = ():Promise<Array<SetPriceStatsEntity>> => {
  return setPriceStatsRepository.getMany([]);
}

const retrieveStatsForSet = (setId:string):Promise<SetPriceStatsEntity|null> => {
  return singleResultRepoQuerier.query(
    setPriceStatsRepository,
    [ {name: "setId", value: setId} ],
    'Set price stats'
  );
}

const retrieveStatsUpdatedBefore = (before:Moment, limit:number):Promise<Array<SetPriceStatsEntity>> => {
  return setPriceStatsRepository.getMany([
      { field: "lastCalculationTime", operation: "<", value: momentToTimestamp(before) },
    ],
    {
      limit,
      sort: [ { field: "lastCalculationTime", order: SortOrder.ASC } ],
    }
  );
}

const retrieve = (id:string):Promise<SetPriceStatsEntity> => {
  return byIdRetriever.retrieve(
    setPriceStatsRepository,
    id,
    setPriceStatsRepository.collectionName
  )
}

export const setPriceStatsRetriever = {
  retrieve,
  retrieveAll,
  retrieveStatsForSet,
  retrieveStatsUpdatedBefore,
}