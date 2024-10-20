import {SessionAggregateStatsEntity, sessionAggregateStatsRepository} from "./SessionAggregateStatsEntity";


const retrieveByGroupingKeys = (groupingKeys:Array<string>):Promise<Array<SessionAggregateStatsEntity>> => {
  return sessionAggregateStatsRepository.getMany({
    groupingKey: {$in: groupingKeys},
  })
}

export const sessionAggregateStatsRetriever = {
  retrieveByGroupingKeys,
}