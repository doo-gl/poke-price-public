import {cardPriceSelectionRetriever} from "./CardPriceSelectionRetriever";
import {cardSelectionUniquenessEnforcer} from "./CardSelectionUniquenessEnforcer";
import {cardStatsRetrieverV2} from "./CardStatsRetriever";
import {cardStatsUniquenessEnforcer} from "./CardStatsUniquenessEnforcer";


const enforce = async (cardId:string) => {

  const stats = await cardStatsRetrieverV2.retrieveForCardId(cardId)
  await cardStatsUniquenessEnforcer.enforce(stats)

  const selections = await cardPriceSelectionRetriever.retrieveForCardId(cardId);
  await cardSelectionUniquenessEnforcer.enforce(selections, stats)

}

export const cardSelectionAndStatsUniquenessEnforcer = {
  enforce,
}