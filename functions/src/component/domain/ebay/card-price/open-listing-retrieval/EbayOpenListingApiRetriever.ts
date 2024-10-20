import {SearchParams} from "../../search-param/EbayCardSearchParamEntity";
import {ebayOpenListingParser, OpenListing, OpenListingResult} from "./EbayOpenListingParser";
import {EbaySearchItemSummary} from "../../api/EbayApiItemSearchClient";
import {EbaySite} from "../../api/EbayApiClientTypes";
import {ebayApiClient} from "../../api/EbayApiClient";
import {logger} from "firebase-functions";
import {ebayApiClientTypeConverter} from "../../api/EbayApiClientTypeConverters";
import {removeNulls} from "../../../../tools/ArrayNullRemover";
import moment from "moment";

const mapApiResponseToParseResult = (apiItem:EbaySearchItemSummary):OpenListing|null => {
  try {
    const bidPrice = apiItem.currentBidPrice
      ? ebayApiClientTypeConverter.parseCurrencyAmount(apiItem.currentBidPrice)
      : null
    const buyItNowPrice = apiItem.price
      ? ebayApiClientTypeConverter.parseCurrencyAmount(apiItem.price)
      : null
    const listingTypes = apiItem.buyingOptions.map(op => ebayApiClientTypeConverter.parseListingTypes(op))

    const price = bidPrice ?? buyItNowPrice
    const endTime = apiItem.itemEndDate
      ? moment(apiItem.itemEndDate)
      : null

    const imageUrls = new Array<string>()
      .concat(apiItem.image?.imageUrl ? [apiItem.image.imageUrl] : [])
      .concat(apiItem.additionalImages?.map(img => img.imageUrl) ?? [])

    if (!price) {
      return null
    }
    if (apiItem.itemGroupHref) {
      return null
    }

    return {
      listingName: apiItem.title,
      price,
      buyItNowPrice,
      listingTypes,
      bidCount: apiItem.bidCount ?? null,
      endTime,
      url: apiItem.itemWebUrl.slice(0, apiItem.itemWebUrl.indexOf("?")),
      id: apiItem.legacyItemId,
      imageUrls,
      searchUrl: "",
      description: "",
      listingSpecifics: {},
      sellersNotes: null,
    }
  } catch (err:any) {
    logger.error(`Error while reading listing details: ${err.message}`, err)
    return null
  }
}

const retrieveForSite = async (searchParams:SearchParams, ebaySite:EbaySite):Promise<OpenListingResult> => {

  const apiResponse = await ebayApiClient.search(searchParams, {ebaySite})

  const listings = removeNulls(apiResponse.itemSummaries?.map(summary => mapApiResponseToParseResult(summary)) ?? [])

  logger.info(`Found ${listings.length} listings at site: ${ebaySite} for params: [${searchParams.includeKeywords.join(', ')}]`);
  const filteredListings = ebayOpenListingParser.filterListings(listings, searchParams);
  const listingsDiff = listings.length - filteredListings.length;
  if (listingsDiff > 0) {
    logger.info(`Filtering removed ${listings.length - filteredListings.length} listings for params: [${searchParams.includeKeywords.join(', ')}]`);
  }
  logger.info(`After filtering, returning ${listings.length} listings at site: ${ebaySite} for params: [${searchParams.includeKeywords.join(', ')}]`);
  return {
    captcha: false,
    numberOfFilteredListings: listingsDiff,
    listings: filteredListings,
  };
}

const retrieve = async (searchParams:SearchParams):Promise<OpenListingResult> => {
  const ukResults = await retrieveForSite(searchParams, EbaySite.EBAY_GB)
  const usResults = await retrieveForSite(searchParams, EbaySite.EBAY_US);

  return ebayOpenListingParser.combine(ukResults, usResults);
}

export const ebayOpenListingApiRetriever = {
  retrieve,
}