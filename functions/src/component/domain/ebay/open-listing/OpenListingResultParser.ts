import {ebayOpenListingRetriever} from "./EbayOpenListingRetriever";
import {EbayOpenListingCheckResult, ResultType} from "../card-price/open-listing-retrieval/OpenListingPageChecker";
import {toInputValueMap} from "../../../tools/MapBuilder";
import {EbayOpenListingEntity} from "./EbayOpenListingEntity";
import {ebayOpenListingChecker} from "./EbayOpenListingChecker";
import {ebayOpenListingSourcer} from "./EbayOpenListingSourcer";
import {OpenListing} from "../card-price/open-listing-retrieval/EbayOpenListingParser";
import {removeNulls} from "../../../tools/ArrayNullRemover";
import {logger} from "firebase-functions";
import {itemRetriever} from "../../item/ItemRetriever";
import {flattenArray} from "../../../tools/ArrayFlattener";

interface ListingWithResult {
  listing:EbayOpenListingEntity,
  result:EbayOpenListingCheckResult
}

const checkResultsAgainstListings = async (results:Array<ListingWithResult>) => {

  await Promise.all(results.map(async res => {
    try {
      await ebayOpenListingChecker.checkResultAgainstListing(res.listing, res.result)
    } catch (err:any) {
      logger.error(`Failed to check listing: ${res.listing.id}, ${err.message}`, err, res.result)
    }
  }))
}

const sourceListingsFromResults = async (cardId:string, openListingResults:Array<EbayOpenListingCheckResult>):Promise<Array<ListingWithResult>> => {
  const listingsToSource:Array<OpenListing> = removeNulls(openListingResults.map(res => {
    if (!res.listingName || !res.price) {
      return null
    }
    return {
      listingName: res.listingName,
      id: res.listingId,
      bidCount: res.bidCount,
      description: res.description,
      listingSpecifics: res.listingSpecifics,
      price: res.price,
      buyItNowPrice: res.buyItNowPrice,
      sellersNotes: res.sellersNotes,
      url: res.url,
      imageUrls: res.imageUrls || [],
      endTime: res.endedTimestamp,
      listingTypes: res.listingTypes ?? [],
      searchUrl: res.url,
    }
  }))
  const item = await itemRetriever.retrieveByIdOrLegacyId(cardId)
  await ebayOpenListingSourcer.sourceForListings(cardId, listingsToSource)
  const newlySourcedListings = flattenArray(await Promise.all([
    ebayOpenListingRetriever.retrieveByCardIdAndListingIds(item._id.toString(), listingsToSource.map(res => res.id)),
    item.legacyId ? ebayOpenListingRetriever.retrieveByCardIdAndListingIds(item.legacyId, listingsToSource.map(res => res.id)) : Promise.resolve([]),
  ]))
  const listingIdToListing = toInputValueMap(newlySourcedListings, input => input.listingId)

  const listingsWithResults:Array<ListingWithResult> = []
  openListingResults.forEach(res => {
    const newListing = listingIdToListing.get(res.listingId)
    if (!newListing) {
      return
    }
    listingsWithResults.push({
      listing: newListing,
      result: res,
    })
  })
  return listingsWithResults
}


const parse = async (cardId:string, openListingResults:Array<EbayOpenListingCheckResult>):Promise<void> => {
  logger.info(`Parsing ${openListingResults.length} results`)
  const preExistingListings = await ebayOpenListingRetriever.retrieveByCardIdAndListingIds(cardId, openListingResults.map(res => res.listingId))
  const listingIdToListing = toInputValueMap(preExistingListings, input => input.listingId)

  const resultsWithPreExistingListing:Array<ListingWithResult> = []
  const resultsWithoutListing:Array<EbayOpenListingCheckResult> = []
  openListingResults.forEach(result => {
    const listing = listingIdToListing.get(result.listingId)
    if (listing) {
      resultsWithPreExistingListing.push({listing, result})
    } else {
      resultsWithoutListing.push(result)
    }
  })
  logger.info(`Found ${resultsWithPreExistingListing.length} pre-existing results and ${resultsWithoutListing.length} new results`)

  await checkResultsAgainstListings(resultsWithPreExistingListing)
  const newlySourcedResults = await sourceListingsFromResults(cardId, resultsWithoutListing)
  await checkResultsAgainstListings(newlySourcedResults)
}

export const openListingResultParser = {
  parse,
}