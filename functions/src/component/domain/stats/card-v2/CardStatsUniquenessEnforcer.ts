import {CardStatsEntityV2, cardStatsRepository} from "./CardStatsEntityV2";
import {toInputValueMultiMap} from "../../../tools/MapBuilder";
import {comparatorBuilder} from "../../../infrastructure/ComparatorBuilder";


const enforce = async (stats:Array<CardStatsEntityV2>):Promise<Array<CardStatsEntityV2>> => {

  const groupedStats = toInputValueMultiMap(
    stats,
    stat => `${stat.cardId}|${stat.priceType}|${stat.currencyCode}|${stat.condition}|${stat.periodSizeDays}`
  )

  const statIdsToRemove:Array<string> = [];
  const statsToKeep:Array<CardStatsEntityV2> = []

  for (const group of groupedStats.values()) {
    if (group.length === 1) {
      statsToKeep.push(group[0])
      continue;
    }
    const sortedGroup = group.sort(comparatorBuilder.combine(
      comparatorBuilder.objectAttributeDESC(stat => stat.dateCreated.toMillis()),
      comparatorBuilder.objectAttributeDESC(stat => stat.id),
    ))
    const statToKeep = sortedGroup.pop()
    if (statToKeep) {
      statsToKeep.push(statToKeep)
    }
    sortedGroup.forEach(stat => statIdsToRemove.push(stat.id))
  }

  await cardStatsRepository.batchDelete(statIdsToRemove)
  return statsToKeep
}

export const cardStatsUniquenessEnforcer = {
  enforce,
}