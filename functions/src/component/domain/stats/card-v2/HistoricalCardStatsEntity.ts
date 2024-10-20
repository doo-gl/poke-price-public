
import {repositoryFactory} from "../../../database/RepositoryFactory";
import {CardStatsEntityV2} from "./CardStatsEntityV2";

const COLLECTION_NAME = 'historical-card-stats';

export interface HistoricalCardStatsEntity extends CardStatsEntityV2 {
  statsId:string,
}

const result = repositoryFactory.build<HistoricalCardStatsEntity>(COLLECTION_NAME);
export const historicalCardStatsRepository = result.repository;
export const historicalCardStatsCreator = result.creator;
export const historicalCardStatsUpdater = result.updater;