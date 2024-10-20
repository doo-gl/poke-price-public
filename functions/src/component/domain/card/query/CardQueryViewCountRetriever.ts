import {Moment} from "moment/moment";
import {CardQueryViewCountEntity, cardQueryViewCountRepository} from "./CardQueryViewCountEntity";
import {singleResultRepoQuerier} from "../../../database/SingleResultRepoQuerier";
import {momentToTimestamp} from "../../../tools/TimeConverter";


const retrieveByDateAndKey = (date:Moment, key:string):Promise<CardQueryViewCountEntity|null> => {
  return singleResultRepoQuerier.query(
    cardQueryViewCountRepository,
    [
      { name: "key", value: key },
      { name: "date", value: momentToTimestamp(date) },
    ],
    cardQueryViewCountRepository.collectionName,
  )
}

const retrieveBetweenDates = (from:Moment, to:Moment):Promise<Array<CardQueryViewCountEntity>> => {
  return cardQueryViewCountRepository.getMany([
    {field: "date", operation: ">=", value: momentToTimestamp(from)},
    {field: "date", operation: "<", value: momentToTimestamp(to)},
  ])
}

export const cardQueryViewCountRetriever = {
  retrieveByDateAndKey,
  retrieveBetweenDates,
}