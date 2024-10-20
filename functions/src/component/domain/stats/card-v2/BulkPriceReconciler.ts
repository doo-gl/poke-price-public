import {CardPriceSelectionEntity, PriceType} from "./CardPriceSelectionEntity";
import {Price, statsPriceRetriever} from "./StatsPriceRetriever";
import {toInputValueMap} from "../../../tools/MapBuilder";
import {selectionKeyMapper} from "./SelectionKeyMapper";
import {BatchUpdate} from "../../../database/BaseCrudRepository";
import {EbayOpenListingEntity} from "../../ebay/open-listing/EbayOpenListingEntity";
import {HistoricalCardPriceEntity} from "../../historical-card-price/HistoricalCardPriceEntity";
import {ebayOpenListingRepository} from "../../ebay/open-listing/EbayOpenListingRepository";
import {historicalCardPriceRepository} from "../../historical-card-price/HistoricalCardPriceRepository";
import {ebayOpenListingRetriever} from "../../ebay/open-listing/EbayOpenListingRetriever";
import {historicalCardPriceRetriever} from "../../historical-card-price/HistoricalCardPriceRetriever";
import {dedupe} from "../../../tools/ArrayDeduper";
import {ebayOpenListingReconciler} from "../../ebay/open-listing/EbayOpenListingReconciller";
import {cardSelectionListingReconciler} from "./CardSelectionListingReconciler";
import {cardSelectionPriceReconciler} from "./CardSelectionPriceReconciler";


const reconcile = async (
  prices:Array<Price>,
  selections:Array<CardPriceSelectionEntity>,
):Promise<Array<Price>> => {
  const selectionKeyToSelection = toInputValueMap(
    selections,
    selection => selectionKeyMapper.toKey(selection.cardId, selection.priceType, selection.condition, selection.currencyCode)
  )
  const listingUpdates:Array<BatchUpdate<EbayOpenListingEntity>> = []
  const soldPriceUpdates:Array<BatchUpdate<HistoricalCardPriceEntity>> = []
  prices.forEach(price => {

    if (price.listing) {
      const listing = price.listing;
      const selectionKey = selectionKeyMapper.toKey(listing.cardId, PriceType.LISTING_PRICE, listing.condition, listing.mostRecentPrice.currencyCode)
      const selection = selectionKeyToSelection.get(selectionKey)
      if (!selection) {
        return;
      }
      if (!cardSelectionListingReconciler.isListingInSelection(selection, listing)) {
        return;
      }
      if (listing.selectionIds.some(selectionId => selectionId === selection.id)) {
        return;
      }
      const newSelectionIds = listing.selectionIds.concat([selection.id]).sort()
      listingUpdates.push({
        id: listing.id,
        update: {
          selectionIds: newSelectionIds,
        },
      })
    }

    if (price.soldPrice) {
      const soldPrice = price.soldPrice
      const selectionKey = selectionKeyMapper.toKey(soldPrice.cardId, PriceType.SOLD_PRICE, soldPrice.condition, soldPrice.currencyAmount.currencyCode)
      const selection = selectionKeyToSelection.get(selectionKey)
      if (!selection) {
        return
      }
      if (!cardSelectionPriceReconciler.isPriceInSelection(selection, soldPrice)) {
        return;
      }
      if (soldPrice.selectionIds.some(selectionId => selectionId === selection.id)) {
        return;
      }
      const newSelectionIds = soldPrice.selectionIds.concat([selection.id]).sort()
      soldPriceUpdates.push({
        id: soldPrice.id,
        update: {
          selectionIds: newSelectionIds,
        },
      })
    }

  })

  await ebayOpenListingRepository.batchUpdate(listingUpdates)
  await historicalCardPriceRepository.batchUpdate(soldPriceUpdates)

  const updatedListings = await ebayOpenListingRetriever.retrieveByIds(listingUpdates.map(upd => upd.id))
  const updatedSoldPrices = await historicalCardPriceRetriever.retrieveByIds(soldPriceUpdates.map(upd => upd.id))

  const updatedPrices = dedupe(
    prices
      .concat(updatedListings.map(listing => statsPriceRetriever.mapListing(listing)))
      .concat(updatedSoldPrices.map(soldPrice => statsPriceRetriever.mapSold(soldPrice))),
    i => i.id
  )

  return updatedPrices
}

export const bulkPriceReconciler = {
  reconcile,
}