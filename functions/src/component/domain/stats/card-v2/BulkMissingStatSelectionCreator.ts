import {CardPriceSelectionEntity} from "./CardPriceSelectionEntity";
import {CardStatsEntityV2} from "./CardStatsEntityV2";
import {Price} from "./StatsPriceRetriever";
import {cardSelectionUniquenessEnforcer} from "./CardSelectionUniquenessEnforcer";
import {toInputValueMap} from "../../../tools/MapBuilder";
import {ebayCardSearchParamCreator} from "../../ebay/search-param/EbayCardSearchParamCreator";
import {cardPriceSelectionGenerator} from "./CardPriceSelectionGenerator";
import {cardStatsGenerator} from "./CardStatsGenerator";
import {dedupe} from "../../../tools/ArrayDeduper";
import {SelectionKey, selectionKeyMapper} from "./SelectionKeyMapper";

export interface CreateResult {
  selections:Array<CardPriceSelectionEntity>,
  stats:Array<CardStatsEntityV2>
}



const createSelectionsForKeys = async (
  cardId:string,
  selectionKeys:Array<SelectionKey>
):Promise<{selections:Array<CardPriceSelectionEntity>, stats:Array<CardStatsEntityV2>}> => {
  const searchParams = await ebayCardSearchParamCreator.getOrCreateSearchParams(cardId);
  const selections:Array<CardPriceSelectionEntity> = []
  const stats:Array<CardStatsEntityV2> = []
  await Promise.all(
    selectionKeys.map(async selectionKey => {
      const createdSelection = await cardPriceSelectionGenerator.createSelection(
        searchParams, selectionKey.priceType, selectionKey.condition, selectionKey.currencyCode
      )
      const createdStats = await cardStatsGenerator.generateForSelection(createdSelection);
      selections.push(createdSelection)
      createdStats.forEach(stat => stats.push(stat))
    })
  )
  return {
    selections,
    stats,
  }
}

const create = async (
  cardId:string,
  prices:Array<Price>,
  currentSelections:Array<CardPriceSelectionEntity>,
  currentStats:Array<CardStatsEntityV2>,
):Promise<CreateResult> => {
  const uniqueResults = await cardSelectionUniquenessEnforcer.enforce(currentSelections, currentStats)
  const keyToSelectionKey = selectionKeyMapper.mapPricesToSelectionKeys(prices)
  const keyToExistingSelections = toInputValueMap(
    uniqueResults.selections,
    selection => selectionKeyMapper.toKey(selection.cardId, selection.priceType, selection.condition, selection.currencyCode)
  )
  const keysMissingSelections:Array<SelectionKey> = [];
  [...keyToSelectionKey.values()].forEach(selectionKey => {
    const existingSelection = keyToExistingSelections.get(selectionKey.key)
    if (!existingSelection) {
      keysMissingSelections.push(selectionKey)
    }
  })
  const newStatsAndSelections = await createSelectionsForKeys(cardId, keysMissingSelections)

  return {
    stats: dedupe(uniqueResults.stats.concat(newStatsAndSelections.stats), stat => stat.id),
    selections: dedupe(uniqueResults.selections.concat(newStatsAndSelections.selections), stat => stat.id),
  }
}

export const bulkMissingStatSelectionCreator = {
  create,
}