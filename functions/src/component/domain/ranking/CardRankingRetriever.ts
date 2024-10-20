import {CardRankingEntity} from "./CardRankingEntity";
import {cardRankingRepository} from "./CardRankingRepository";


const retrieveMostRecentForKey = async (key:string):Promise<Array<CardRankingEntity>> => {
  return cardRankingRepository.getMany(
    [
      { field: 'key', operation: '==', value: key },
      { field: 'isMostRecent', operation: '==', value: true },
    ]
  );
}

export const cardRankingRetriever = {
  retrieveMostRecentForKey,
}