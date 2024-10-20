import {ebaySearchParamRetriever} from "../../ebay/search-param/EbayCardSearchParamRetriever";
import {cardPriceSelectionRetriever} from "./CardPriceSelectionRetriever";
import {EbayCardSearchParamEntity} from "../../ebay/search-param/EbayCardSearchParamEntity";
import {CardPriceSelectionEntity, cardPriceSelectionRepository} from "./CardPriceSelectionEntity";
import {BatchUpdate} from "../../../database/BaseCrudRepository";
import {lodash} from "../../../external-lib/Lodash";

const updateSelectionsToUseSearch = async (searchParams:EbayCardSearchParamEntity, selections:Array<CardPriceSelectionEntity>):Promise<void> => {
  const updates:Array<BatchUpdate<CardPriceSelectionEntity>> = [];

  selections.forEach(selection => {
    if (
      searchParams.id !== selection.searchId
      || lodash.isNotEqual(searchParams.includeKeywords, selection.searchParams.includeKeywords)
      || lodash.isNotEqual(searchParams.excludeKeywords, selection.searchParams.excludeKeywords)
    ) {
      updates.push({
        id: selection.id,
        update: {
          searchId: searchParams.id,
          searchParams: {
            includeKeywords: searchParams.includeKeywords,
            excludeKeywords: searchParams.excludeKeywords,
          },
          hasReconciled: false,
        },
      })
    }
  })

  await cardPriceSelectionRepository.batchUpdate(updates);
}

const updateSelectionsForCardId = async (cardId:string):Promise<void> => {
  const searchParams = await ebaySearchParamRetriever.retrieveSearchParamsForCardId(cardId);
  if (!searchParams || searchParams.length === 0) {
    return;
  }
  const selections = await cardPriceSelectionRetriever.retrieveForCardId(cardId);
  if (!selections || selections.length === 0) {
    return;
  }
  await updateSelectionsToUseSearch(searchParams[0], selections);
}

export const cardPriceSelectionSearchUpdater = {
  updateSelectionsForCardId,
}