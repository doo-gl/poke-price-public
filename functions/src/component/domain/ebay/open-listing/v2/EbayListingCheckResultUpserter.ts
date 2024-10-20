import {EbayOpenListingCheckResult} from "../../card-price/open-listing-retrieval/OpenListingPageChecker";
import {EbayOpenListingEntity} from "../EbayOpenListingEntity";
import {ebayOpenListingRetriever} from "../EbayOpenListingRetriever";
import {toInputValueMap} from "../../../../tools/MapBuilder";
import {Create, Update} from "../../../../database/Entity";
import {BatchUpdate} from "../../../../database/BaseCrudRepository";
import {HistoricalCardPriceEntity} from "../../../historical-card-price/HistoricalCardPriceEntity";
import {CardPriceSelectionEntity} from "../../../stats/card-v2/CardPriceSelectionEntity";
import {CardStatsEntityV2} from "../../../stats/card-v2/CardStatsEntityV2";

interface ListingResult {
  result:EbayOpenListingCheckResult,
  preExistingListing:EbayOpenListingEntity|null,
}

interface ListingChange {
  listingResult:ListingResult,
  listingCreate:Create<EbayOpenListingEntity>|null,
  listingUpdate:BatchUpdate<EbayOpenListingEntity>|null,
  priceCreate:Create<HistoricalCardPriceEntity>|null,
  priceUpdate:BatchUpdate<HistoricalCardPriceEntity>|null,
}

interface SelectionStatChange {
  selectionCreates:Array<Create<CardPriceSelectionEntity>>
  statCreates:Array<Create<CardStatsEntityV2>>
  listingUpdates:Array<BatchUpdate<EbayOpenListingEntity>>
}

const pairResultsWithPreExistingListings = async (cardId:string, results:Array<EbayOpenListingCheckResult>):Promise<Array<ListingResult>> => {
  const listingIds = results.map(result => result.listingId)
  const listings = await ebayOpenListingRetriever.retrieveByCardIdAndListingIds(cardId, listingIds)
  const listingIdToListing = toInputValueMap(listings, listing => listing.listingId)
  const listingResults:Array<ListingResult> = []
  results.forEach(result => {
    const preExistingListing = listingIdToListing.get(result.listingId) ?? null
    listingResults.push({
      result,
      preExistingListing,
    })
  })
  return listingResults
}

const upsert = async (cardId:string, results:Array<EbayOpenListingCheckResult>):Promise<void> => {

  // for each check result
  // map to a list of batch creates / updates to openlisting / cardprice
  // start transaction
  // commit those changes in batch
  // generate the changes that result for selections / stats
  // commit those changes in batch
  // end transaction

}

export const ebayCheckResultUpserter = {
  upsert,
}