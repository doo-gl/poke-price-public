import {cardPriceSelectionRetriever} from "./CardPriceSelectionRetriever";
import {CardPriceSelectionEntity, PriceType} from "./CardPriceSelectionEntity";
import {cardStatsCreator, CardStatsEntityV2} from "./CardStatsEntityV2";
import {Create} from "../../../database/Entity";
import {cardStatsRetrieverV2} from "./CardStatsRetriever";
import {statsCalculator} from "./StatsCalculator";
import {TimestampStatic} from "../../../external-lib/Firebase";


const createStats = async (selection:CardPriceSelectionEntity, periodSizeDays:number):Promise<CardStatsEntityV2> => {
  const now = TimestampStatic.now()
  const create:Create<CardStatsEntityV2> = {
    cardId: selection.cardId,
    selectionId: selection.id,
    itemIds: [],
    stats: statsCalculator.defaultStats(selection.currencyCode),
    from: now,
    to: now,
    nextCalculationTime: now,
    lastCalculatedAt: now,
    periodSizeDays: periodSizeDays,
    condition: selection.condition,
    currencyCode: selection.currencyCode,
    priceType: selection.priceType,
    modificationKeys: [],
    modificationStats: [],
  }
  const preExistingStats = await cardStatsRetrieverV2.retrievePreExisting(create);
  if (preExistingStats) {
    return preExistingStats;
  }
  return await cardStatsCreator.create(create);
}

const generateForSelection = (selection:CardPriceSelectionEntity):Promise<Array<CardStatsEntityV2>> => {
  if (selection.priceType === PriceType.SOLD_PRICE) {
    return Promise.all([
      createStats(selection, 14),
      createStats(selection, 90),
    ])
  } else if (selection.priceType === PriceType.LISTING_PRICE) {
    return Promise.all([
      createStats(selection, 1),
      createStats(selection, 14),
    ])
  }
  return Promise.resolve([])
}

const generate = async (cardId:string):Promise<void> => {
  const selections = await cardPriceSelectionRetriever.retrieveForCardId(cardId);
  await Promise.all(
    selections.map(selection => generateForSelection(selection))
  )
}

export const cardStatsGenerator = {
  generate,
  generateForSelection,
}