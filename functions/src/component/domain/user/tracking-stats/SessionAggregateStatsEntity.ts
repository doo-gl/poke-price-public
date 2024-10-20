import {MongoEntity} from "../../../database/mongo/MongoEntity";
import {SessionAggregateStats} from "./SessionAggregateStatCalculator";
import {SessionStats} from "./SessionStatCalculator";
import {mongoRepositoryFactory} from "../../../database/mongo/MongoRepositoryFactory";


export interface SessionAggregateStatsEntity extends MongoEntity {
  groupingKey:string
  stats:Omit<SessionAggregateStats, 'sessionStats'>
  sessions:Array<SessionStats>
  lastCalculated:Date,
}

export const buildGroupingKey = (keyValues:Array<{key:string, value:string}>):string => {
  const tokens = keyValues.map(kv => `${kv.key}=${kv.value}`)
  tokens.sort()
  return tokens.join('|')
}

const COLLECTION_NAME = 'session.aggregate.stats'

const result = mongoRepositoryFactory.build<SessionAggregateStatsEntity>(COLLECTION_NAME);
export const sessionAggregateStatsRepository = result.repository;
export const baseSessionAggregateStatsCreator = result.creator;
export const baseSessionAggregateStatsUpdater = result.updater;
export const baseSessionAggregateStatsDeleter = result.deleter;