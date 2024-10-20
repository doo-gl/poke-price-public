import {SearchParams} from "../../search-param/EbayCardSearchParamEntity";
import {CurrencyAmountLike} from "../../../money/CurrencyAmount";
import {ListingType} from "../../open-listing/EbayOpenListingEntity";
import {Moment} from "moment";
import {ebayOpenListingUrlCreator} from "./EbayOpenListingUrlCreator";
import {ebaySoldListingsHtmlClient} from "../../../../client/EbaySoldListingsHtmlClient";
import {logger} from "firebase-functions";
import cheerio from "cheerio";
import {searchParamValidator} from "../../search-param/SearchParamValidator";
import {ebayUrlParser} from "../../search-param/EbayUrlParser";
import {ParsingError} from "../../../../error/ParsingError";
import {handleAllErrors} from "../../../../tools/AllPromiseHandler";
import {removeNulls} from "../../../../tools/ArrayNullRemover";
import {openListingDetailParser} from "./OpenListingDetailParser";
import {ExternalClientError} from "../../../../error/ExternalClientError";
import {outerJoin} from "../../../../tools/Joins";
import {toInputValueMap} from "../../../../tools/MapBuilder";
import Root = cheerio.Root;
import Cheerio = cheerio.Cheerio;
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";

export interface OpenListingResult {
  listings:Array<OpenListing>,
  numberOfFilteredListings:number,
  captcha:boolean,
}

export interface OpenListing {
  listingName:string,
  price:CurrencyAmountLike,
  buyItNowPrice:CurrencyAmountLike|null,
  listingTypes:Array<ListingType>,
  endTime:Moment|null,
  bidCount:number|null,
  url:string,
  id:string,
  imageUrls:Array<string>,
  searchUrl:string,
  sellersNotes:string|null,
  listingSpecifics:{[key:string]:string},
  description:string|null,
}

enum ResultType {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

interface OpenListingParseResult {
  listing:OpenListing|null,
  resultType:ResultType,
}

const parseOpenListingDetails = async (url:string, listing:Cheerio):Promise<OpenListingParseResult> => {
  try {
    const openListing = await openListingDetailParser.parse(url, listing)
    return openListing
      ? { listing: openListing, resultType: ResultType.SUCCESS }
      : { listing: null, resultType: ResultType.SKIPPED }
  } catch (err:any) {
    if (err instanceof ExternalClientError) {
      if (err.responseStatus === 404) {
        logger.info(`Failed to parse listing: ${err.message}, ${err.requestMethod} - ${err.url} - ${err.responseStatus}`);
        return { listing: null, resultType: ResultType.SKIPPED }
      } else {
        logger.error(`Failed to parse listing: ${err.message}, ${err.requestMethod} - ${err.url} - ${err.responseStatus}`);
      }
    } else {
      logger.error(`Failed to parse listing`, err);
    }
    return { listing: null, resultType: ResultType.FAILED };
  }
}


const parseListingsFromPage = async (url:string, $:Root):Promise<Array<OpenListing>> => {
  const resultList:Cheerio = $('ul.srp-results');
  if (resultList.length !== 1) {
    throw new ParsingError(`Found more than 1 set of open listing results at url: ${url}`)
  }
  const openListingItems = resultList.find('li.s-item');
  const queue = new ConcurrentPromiseQueue<OpenListingParseResult>({maxNumberOfConcurrentPromises: 4})
  const parseResultPromises:Array<Promise<OpenListingParseResult|null>> = []
  openListingItems.each(function (this:Cheerio, index, elem) {
    const item: Cheerio = $(this); // eslint-disable-line no-invalid-this
    parseResultPromises.push(queue.addPromise(() => parseOpenListingDetails(url, item)));
  });
  const parseResults = await handleAllErrors(parseResultPromises, 'Error while parsing listings');
  const openListings = removeNulls(parseResults.map(result => result?.listing ?? null))
  const failCount = parseResults.filter(listing => listing?.resultType === ResultType.FAILED).length
  if (openListings.length === 0 && failCount > 0) {
    logger.error(`Failed all listing on page, might be a sign that the html parsing is broken, url: ${url}`);
  }
  return openListings;
}

const filterListings = (listings:Array<OpenListing>, searchParams:SearchParams) => {
  return listings.filter(listing => {
    const validationResult = searchParamValidator.validate(searchParams, listing.listingName)
    if (!validationResult.isValid) {
      logger.info(`Filtered: ${listing.listingName} - ${validationResult.reasons.join(', ')}`)
    }
    return validationResult.isValid;
  });
}

const parseUrl = async (url:string):Promise<OpenListingResult> => {
  const searchParams = ebayUrlParser.parse(url);
  // const response = await ebaySoldListingsHtmlClient.getListingsForUrlUsingProxies(url);
  const response = await ebaySoldListingsHtmlClient.getListingsForUrl(url);
  // const response = await ebaySoldListingsHtmlClient.getListingsForUrlUsingBrowser(url);
  const $ = cheerio.load(response.htmlPage);

  if ($('#captcha_form').length > 0) {
    logger.error(`Served captcha on url: ${url}`);
    return {captcha: true, numberOfFilteredListings: 0, listings: []}
  }

  const listings = await parseListingsFromPage(url, $);
  logger.info(`Found ${listings.length} listings at url: ${url}`);
  const filteredListings = filterListings(listings, searchParams);
  const listingsDiff = listings.length - filteredListings.length;
  if (listingsDiff > 0) {
    logger.info(`Filtering removed ${listings.length - filteredListings.length} listings for url: ${url}`);
  }

  return {
    captcha: false,
    numberOfFilteredListings: listingsDiff,
    listings: filteredListings,
  };
}

const combine = (left:OpenListingResult, right:OpenListingResult):OpenListingResult => {
  const captcha = left.captcha || right.captcha;
  const join = outerJoin(
    toInputValueMap(left.listings, res => res.id),
    toInputValueMap(right.listings, res => res.id),
  )
  const results:Array<OpenListing> = [];
  [...join.values()].forEach(pair => {
    const result = pair.value1 || pair.value2;
    if (!result) {
      return
    }
    results.push(result)
  })
  return {
    captcha,
    listings: results,
    numberOfFilteredListings: left.numberOfFilteredListings + right.numberOfFilteredListings,
  }
}

const parse = async (searchParams:SearchParams):Promise<OpenListingResult> => {
  const ukUrl = ebayOpenListingUrlCreator.createUK(searchParams);
  const usUrl = ebayOpenListingUrlCreator.createUS(searchParams);

  const ukResults = await parseUrl(ukUrl)
  const usResults = await parseUrl(usUrl);

  // return ukResults;
  return combine(ukResults, usResults);
}

export const ebayOpenListingParser = {
  parse,
  parseUrl,
  combine,
  filterListings,
}