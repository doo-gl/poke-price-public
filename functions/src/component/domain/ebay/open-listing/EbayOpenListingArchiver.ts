import {ebayOpenListingRetriever} from "./EbayOpenListingRetriever";
import {historicalCardPriceRetriever} from "../../historical-card-price/HistoricalCardPriceRetriever";
import {userContext} from "../../../infrastructure/UserContext";
import {InvalidArgumentError} from "../../../error/InvalidArgumentError";
import {ebayOpenListingUpdater} from "./EbayOpenListingRepository";
import {ListingState} from "./EbayOpenListingEntity";
import {cardStatsRetrieverV2} from "../../stats/card-v2/CardStatsRetriever";
import {cardStatsCalculator} from "../../stats/card-v2/CardStatsCalculator";
import {priceIgnorer} from "../../historical-card-price/PriceIgnorer";
import {marketplaceListingDeleter} from "../../marketplace/MarketplaceListingDeleter";
import {marketplaceListingRetriever} from "../../marketplace/MarketplaceListingRetriever";
import {marketListingSynchroniser} from "../../marketplace/MarketListingSynchroniser";


const archive = async (openListingId:string):Promise<void> => {
  const callingUser = userContext.getAdminUser()
  if (!callingUser) {
    throw new InvalidArgumentError(`No calling user`)
  }

  const listing = await ebayOpenListingRetriever.retrieve(openListingId);
  const price = listing.historicalCardPriceId
    ? await historicalCardPriceRetriever.retrieve(listing.historicalCardPriceId)
    : null

  if (price) {
    await priceIgnorer.ignore(price.id)
  }

  await ebayOpenListingUpdater.updateOnly(listing.id, {
    state: ListingState.UNKNOWN,
    buyingOpportunity: null,
    unknownDetails: {
      userId: callingUser.id,
      reason: 'listing was archived',
    },
    selectionIds: [],
  })

  const marketListing = await marketplaceListingRetriever.retrieveOptionalForListingId(listing.id)
  if (marketListing) {
    await marketplaceListingDeleter.deleteListings([marketListing])
  }

  const priceStats = await cardStatsRetrieverV2.retrieveByItemId(listing.id)
  await Promise.all(
    priceStats.map(stat => cardStatsCalculator.calculateForStats(stat))
  )
}

// const deArchive = async (openListingId:string):Promise<void> => {
//   const listing = await ebayOpenListingRetriever.retrieve(openListingId);
//   const price = listing.historicalCardPriceId
//     ? await historicalCardPriceRetriever.retrieve(listing.historicalCardPriceId)
//     : null
//
//   const searchParams = await ebaySearchParamRetriever.retrieveSearchParamsForCardId(listing.cardId)
//   const searchIds:Array<string> = [];
//
//   await Promise.all(
//     searchParams.map(async searchParam => {
//       if (!searchParamValidator.validate(searchParam, listing.listingName)) {
//         return
//       }
//       searchIds.push(searchParam.id)
//     })
//   )
//   const selections = await cardPriceSelectionRetriever.retrieveBySearchIds(searchIds);
//   const selectionIds:Array<string> = selections
//     .filter(selection => cardSelectionListingReconciler.isListingInSelection(selection, listing))
//     .map(selection => selection.id);
//   await ebayOpenListingUpdater.update(listing.id, {
//     state:
//   })
// }

export const ebayOpenListingArchiver = {
  archive,
}