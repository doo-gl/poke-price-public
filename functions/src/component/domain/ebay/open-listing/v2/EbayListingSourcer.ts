import {EbayOpenListingEntity} from "../EbayOpenListingEntity";
import {ebaySearchParamRetriever} from "../../search-param/EbayCardSearchParamRetriever";
import {SearchParams} from "../../search-param/EbayCardSearchParamEntity";
import {flattenArray} from "../../../../tools/ArrayFlattener";
import {ebayOpenListingUrlCreator} from "../../card-price/open-listing-retrieval/EbayOpenListingUrlCreator";
import {ebayListUrlReader} from "../EbayListUrlReader";
import {ebayCheckResultUpserter} from "./EbayListingCheckResultUpserter";
import {
  EbayOpenListingCheckResult,
  openListingPageChecker,
} from "../../card-price/open-listing-retrieval/OpenListingPageChecker";
import {logger} from "firebase-functions";

const mapSearchParamsToUrls = (searchParams:SearchParams, isSold:boolean):Array<string> => {
  const ukUrl = isSold
    ? ebayOpenListingUrlCreator.createSoldUK(searchParams)
    : ebayOpenListingUrlCreator.createUK(searchParams);
  const usUrl = isSold
    ? ebayOpenListingUrlCreator.createSoldUS(searchParams)
    : ebayOpenListingUrlCreator.createUS(searchParams);
  return [ukUrl, usUrl]
}

const getListUrls = async (cardId:string, isSold:boolean):Promise<Array<string>> => {
  const searchParams = await ebaySearchParamRetriever.retrieveSearchParamsForCardId(cardId);
  const nestedUrls = searchParams.map(searchParam => mapSearchParamsToUrls(searchParam, isSold))
  const urls = flattenArray(nestedUrls)
  return urls;
}

const readListing = async (listing:EbayOpenListingEntity):Promise<EbayOpenListingCheckResult|null> => {
  try {
    return await openListingPageChecker.check(listing.listingUrl)
  } catch (err:any) {
    logger.error(`Failed while reading listing: ${listing.id}, url: ${listing.listingUrl}`, err)
    return null
  }
}

const source = async (cardId:string, isSold:boolean):Promise<void> => {
  const listUrls = await getListUrls(cardId, isSold)
  const nestedResults = await Promise.all(
    listUrls.map(url => ebayListUrlReader.read(url))
  )
  const results = flattenArray(nestedResults)
  await ebayCheckResultUpserter.upsert(cardId, results)
}

const sourceOpenListings = async (cardId:string):Promise<void> => {
  await source(cardId, false)
}

const sourceSoldListings = async (cardId:string):Promise<void> => {
  await source(cardId, false)
}

const sourceFromListing = async (listing:EbayOpenListingEntity):Promise<void> => {
  const result = await readListing(listing)
  if (!result) {
    return
  }
  await ebayCheckResultUpserter.upsert(listing.cardId, [result])
}

export const ebayListingSourcer = {
  sourceFromListing,
  sourceOpenListings,
  sourceSoldListings,
}