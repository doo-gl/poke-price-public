import {Moment} from "moment";
import {CardPriceStatsEntity} from "./CardPriceStatsEntity";
import {cardPriceStatsRepository} from "./CardPriceStatsRepository";
import {momentToTimestamp} from "../../../tools/TimeConverter";
import {SortOrder} from "../../../database/BaseCrudRepository";
import {singleResultRepoQuerier} from "../../../database/SingleResultRepoQuerier";
import {UniqueSet} from "../../set/UniqueSet";
import {byIdRetriever} from "../../../database/ByIdRetriever";

const retrieve = (id:string):Promise<CardPriceStatsEntity> => {
  return byIdRetriever.retrieve(
    cardPriceStatsRepository,
    id,
    cardPriceStatsRepository.collectionName
  );
}

const retrieveStatsUpdatedBefore = (before:Moment, limit:number):Promise<Array<CardPriceStatsEntity>> => {
  return cardPriceStatsRepository.getMany([
      { field: "lastCalculationTime", operation: "<", value: momentToTimestamp(before) },
    ],
    {
      limit,
      sort: [ { field: "lastCalculationTime", order: SortOrder.ASC } ],
    }
  );
}

const retrieveAll = ():Promise<Array<CardPriceStatsEntity>> => {
  return cardPriceStatsRepository.getMany(
    [],
    {
      sort: [
        { field: "series", order: SortOrder.ASC },
        { field: "set", order: SortOrder.ASC },
        { field: "numberInSet", order: SortOrder.ASC },
      ],
    }
  )
}

const retrieveStatsForCard = (cardId:string):Promise<CardPriceStatsEntity|null> => {
  return singleResultRepoQuerier.query(
    cardPriceStatsRepository,
    [
      { name: "cardId", value: cardId },
    ],
    cardPriceStatsRepository.collectionName,
  );
}

const retrieveStatsForSet = (set:UniqueSet):Promise<Array<CardPriceStatsEntity>> => {
  return cardPriceStatsRepository.getMany([
    { field: "series", operation: "==", value: set.series },
    { field: "set", operation: "==", value: set.set },
  ])
}

export const cardPriceStatsRetriever = {
  retrieve,
  retrieveStatsUpdatedBefore,
  retrieveAll,
  retrieveStatsForCard,
  retrieveStatsForSet,
}