import {PortfolioStatsHistoryEntity, portfolioStatsHistoryRepository} from "./PortfolioStatsHistoryEntity";
import {toInputValueMultiMap} from "../../tools/MapBuilder";
import {timestampToMoment} from "../../tools/TimeConverter";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {batchArray} from "../../tools/ArrayBatcher";

const BY_TIMESTAMP_ASC = comparatorBuilder.combineAll<PortfolioStatsHistoryEntity>(
  comparatorBuilder.objectAttributeASC(val => val.timestamp.toDate().getTime()),
  comparatorBuilder.objectAttributeASC(val => val.dateCreated.toDate().getTime()),
  comparatorBuilder.objectAttributeASC(val => val.id)
)

const clean = async (historyEntries:Array<PortfolioStatsHistoryEntity>):Promise<Array<PortfolioStatsHistoryEntity>> => {

  const dayToHistoryEntries = toInputValueMultiMap(historyEntries, hist => timestampToMoment(hist.timestamp).format("YYYY-MM-DD"))
  const historyEntryIdsToDelete = new Array<string>()
  const historyEntriesToKeep = new Array<PortfolioStatsHistoryEntity>()
  dayToHistoryEntries.forEach((dayGroup:Array<PortfolioStatsHistoryEntity>) => {

    const sortedGroup = dayGroup.slice().sort(BY_TIMESTAMP_ASC)

    const mostRecentEntry = sortedGroup.pop()
    if (!mostRecentEntry) {
      return
    }

    historyEntriesToKeep.push(mostRecentEntry)
    sortedGroup.forEach(entry => historyEntryIdsToDelete.push(entry.id))
  })


  if (historyEntryIdsToDelete.length > 0) {
    const idBatches = batchArray(historyEntryIdsToDelete, 100)
    await Promise.all(idBatches.map(idBatch => portfolioStatsHistoryRepository.batchDelete(idBatch)))
  }

  return historyEntriesToKeep.sort(BY_TIMESTAMP_ASC)
}

export const portfolioHistoryTimeGroupCleaner = {
  clean,
}