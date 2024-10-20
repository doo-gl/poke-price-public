
import {searchKeywordCalculator} from "../ebay/search-param/SearchKeywordCalculator";
import {tempKeywordUrlUpdater} from "../ebay/search-param/temp-keyword-url/TempKeywordUrlUpdater";
import {ebayCardSearchParamCreator} from "../ebay/search-param/EbayCardSearchParamCreator";
import {cardPriceSelectionRetriever} from "../stats/card-v2/CardPriceSelectionRetriever";
import {CardPriceSelectionEntity, cardPriceSelectionRepository} from "../stats/card-v2/CardPriceSelectionEntity";
import {BatchUpdate} from "../../database/BaseCrudRepository";
import {SearchKeywords} from "./CardEntity";
import {ItemEntity, itemUpdater} from "../item/ItemEntity";
import {cardItemRetriever} from "../item/CardItemRetriever";

const updateSearchParams = async (cardId:string) => {
  const newSearchParams = await ebayCardSearchParamCreator.createFromItemKeywords(cardId)
  const selections = await cardPriceSelectionRetriever.retrieveForCardId(cardId);
  const updates:Array<BatchUpdate<CardPriceSelectionEntity>> = []
  selections.forEach(selection => {
    updates.push({
      id: selection.id,
      update: {
        searchId: newSearchParams.id,
        searchParams: {
          includeKeywords: newSearchParams.includeKeywords,
          excludeKeywords: newSearchParams.excludeKeywords,
        },
        hasReconciled: false,
      },
    })
  })
  await cardPriceSelectionRepository.batchUpdate(updates);
}

const update = async (cardId:string, searchKeywords:SearchKeywords):Promise<ItemEntity> => {
  const card = await cardItemRetriever.retrieve(cardId);

  const updatedCard = await itemUpdater.updateAndReturn(card._id, { searchKeywords });
  const searchParams = await searchKeywordCalculator.calculate(cardId);
  await tempKeywordUrlUpdater.update(cardId, searchParams);

  await updateSearchParams(cardId)

  return updatedCard;
}

export const cardSearchKeywordUpdater = {
  update,
  updateSearchParams,
}