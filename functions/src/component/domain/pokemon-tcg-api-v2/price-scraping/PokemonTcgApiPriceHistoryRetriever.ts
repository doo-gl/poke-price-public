import {PokemonTcgApiPriceHistoryEntity, pokemonTcgApiPriceHistoryRepository} from "./PokemonTcgApiPriceHistoryEntity";
import {SortOrder} from "../../../database/BaseCrudRepository";
import {Moment} from "moment";
import {momentToTimestamp} from "../../../tools/TimeConverter";


const retrieveMostRecentForItemId = async (itemId:string):Promise<PokemonTcgApiPriceHistoryEntity|null> => {
  const result = await pokemonTcgApiPriceHistoryRepository.getMany(
    [{field: "itemId", operation: "==", value: itemId}],
    {limit: 1, sort: [{field: "timestamp", order: SortOrder.DESC}]}
  )
  if (result.length === 0) {
    return null
  }
  return result[0]
}

const retrieveForItemIdAfterTime = async (itemId:string, time:Moment):Promise<Array<PokemonTcgApiPriceHistoryEntity>> => {
  const result = await pokemonTcgApiPriceHistoryRepository.getMany(
    [
      {field: "itemId", operation: "==", value: itemId},
      {field: "timestamp", operation: ">=", value: momentToTimestamp(time)},
    ],
    {sort: [{field: "timestamp", order: SortOrder.ASC}]}
  )
  return result
}


export const pokemonTcgApiPriceHistoryRetriever = {
  retrieveMostRecentForItemId,
  retrieveForItemIdAfterTime,
}