import {CardPriceSelectionEntity, cardPriceSelectionUpdater} from "./CardPriceSelectionEntity";
import {cardSelectionPriceReconciler} from "./CardSelectionPriceReconciler";
import {cardSelectionListingReconciler} from "./CardSelectionListingReconciler";
import {cardPriceSelectionRetriever} from "./CardPriceSelectionRetriever";
import {ebaySearchParamRetriever} from "../../ebay/search-param/EbayCardSearchParamRetriever";
import moment from "moment";
import {timestampToMoment} from "../../../tools/TimeConverter";
import {logger} from "firebase-functions";


const reconcile = async (selectionId:string):Promise<void> => {
  const selection = await cardPriceSelectionRetriever.retrieve(selectionId);
  await reconcileForSelection(selection)
}

const reconcileForSelection = async (selection:CardPriceSelectionEntity):Promise<void> => {

  const searchParams = await ebaySearchParamRetriever.retrieve(selection.searchId);
  const hasBeenReconciledRecently = moment().subtract(30, 'days').isBefore(timestampToMoment(searchParams.lastReconciled));
  if (!hasBeenReconciledRecently) {
    logger.info(`Search with id: ${searchParams.id} has not been reconciled recently, last reconcile: ${timestampToMoment(searchParams.lastReconciled).toISOString()}, not reconciling selection until search is reconciled`);
    return;
  }

  await cardSelectionPriceReconciler.reconcile(selection.id);
  await cardSelectionListingReconciler.reconcile(selection.id);
  await cardPriceSelectionUpdater.updateOnly(selection.id, { hasReconciled: true })

}

const reconcileForCard = async (cardId:string):Promise<void> => {
  const selections = await cardPriceSelectionRetriever.retrieveForCardId(cardId);
  await Promise.all(
    selections.map(selection => reconcileForSelection(selection))
  )
}

export const cardSelectionReconciler = {
  reconcile,
  reconcileForSelection,
  reconcileForCard,
}