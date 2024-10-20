import {historicalCardPriceRetriever} from "./HistoricalCardPriceRetriever";
import {ebaySearchParamRetriever} from "../ebay/search-param/EbayCardSearchParamRetriever";
import {cardPriceSelectionRetriever} from "../stats/card-v2/CardPriceSelectionRetriever";
import {ebaySearchParamPriceReconciler} from "../ebay/search-param/EbaySearchParamPriceReconciler";
import {cardSelectionPriceReconciler} from "../stats/card-v2/CardSelectionPriceReconciler";
import {historicalCardPriceUpdater} from "./HistoricalCardPriceUpdater";
import {State} from "./HistoricalCardPriceEntity";


const activate = async (priceId:string) => {
  const price = await historicalCardPriceRetriever.retrieve(priceId);
  const cardId = price.cardId;

  const updatedPrice = await historicalCardPriceUpdater.update(priceId, { state: State.ACTIVE })

  const searchParams = await ebaySearchParamRetriever.retrieveSearchParamsForCardId(cardId);
  const searchIds = searchParams
    .filter(searchParam => ebaySearchParamPriceReconciler.isPriceInSearch(searchParam, updatedPrice))
    .map(searchParam => searchParam.id);

  const selections = await cardPriceSelectionRetriever.retrieveForCardId(cardId);
  const selectionIds = selections
    .filter(selection => cardSelectionPriceReconciler.isPriceInSelection(selection, updatedPrice))
    .map(selection => selection.id)

  await historicalCardPriceUpdater.update(priceId, {
    selectionIds,
    searchIds,
  })
}

export const priceActivator = {
  activate,
}