import {CardPriceSelectionEntity, cardPriceSelectionRepository} from "./CardPriceSelectionEntity";
import {toInputValueMultiMap} from "../../../tools/MapBuilder";
import {comparatorBuilder} from "../../../infrastructure/ComparatorBuilder";
import {CardStatsEntityV2, cardStatsRepository} from "./CardStatsEntityV2";


const enforce = async (
  selections:Array<CardPriceSelectionEntity>,
  stats:Array<CardStatsEntityV2>
):Promise<{selections:Array<CardPriceSelectionEntity>, stats:Array<CardStatsEntityV2>}> => {

  const groupedSelections = toInputValueMultiMap(
    selections,
    selection => `${selection.cardId}|${selection.priceType}|${selection.currencyCode}|${selection.condition}`
  )

  const selectionIdsToRemove = new Set<string>()
  const selectionsToKeep:Array<CardPriceSelectionEntity> = []

  for (const group of groupedSelections.values()) {
    if (group.length === 1) {
      selectionsToKeep.push(group[0])
      continue;
    }
    const sortedGroup = group.sort(comparatorBuilder.combine(
      comparatorBuilder.objectAttributeDESC(selection => selection.dateCreated.toMillis()),
      comparatorBuilder.objectAttributeDESC(selection => selection.id),
    ))
    const selectionToKeep = sortedGroup.pop()
    if (selectionToKeep) {
      selectionsToKeep.push(selectionToKeep)
    }
    sortedGroup.forEach(selection => selectionIdsToRemove.add(selection.id))
  }

  const groupedStats = toInputValueMultiMap(
    stats,
    stat => `${stat.cardId}|${stat.priceType}|${stat.currencyCode}|${stat.condition}|${stat.periodSizeDays}`
  )

  const statIdsToRemove:Array<string> = []
  const statsToKeep:Array<CardStatsEntityV2> = []

  for (const group of groupedStats.values()) {
    const filteredGroup:Array<CardStatsEntityV2> = []
    group.forEach(stat => {
      if (selectionIdsToRemove.has(stat.selectionId)) {
        statIdsToRemove.push(stat.id)
      } else {
        filteredGroup.push(stat)
      }
    })

    if (filteredGroup.length === 1) {
      statsToKeep.push(group[0])
      continue;
    }
    const sortedGroup = filteredGroup.sort(comparatorBuilder.combine(
      comparatorBuilder.objectAttributeDESC(stat => stat.dateCreated.toMillis()),
      comparatorBuilder.objectAttributeDESC(stat => stat.id),
    ))
    const statToKeep = sortedGroup.pop()
    if (statToKeep) {
      statsToKeep.push(statToKeep)
    }
    sortedGroup.forEach(stat => statIdsToRemove.push(stat.id))
  }

  if (selectionIdsToRemove.size > 0) {
    await cardPriceSelectionRepository.batchDelete([...selectionIdsToRemove])
  }
  if (statIdsToRemove.length > 0) {
    await cardStatsRepository.batchDelete(statIdsToRemove)
  }

  return {
    stats: statsToKeep,
    selections: selectionsToKeep,
  }
}

export const cardSelectionUniquenessEnforcer = {
  enforce,
}