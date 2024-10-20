import {ebayUrlParser} from "../../search-param/EbayUrlParser";
import {
  EbayListingDetails,
  ebayEndedListingDetailsRetriever,
  EbayListingSourceResult,
  ResultType,
} from "./EbayEndedListingDetailsRetriever";
import {ebaySoldListingsHtmlClient} from "../../../../client/EbaySoldListingsHtmlClient";
import {SearchParams} from "../../search-param/EbayCardSearchParamEntity";
import {searchParamValidator} from "../../search-param/SearchParamValidator";
import {logger} from "firebase-functions";
import {EbaySaleType} from "../EbayCardListingSearcher";
import {ParsingError} from "../../../../error/ParsingError";
import {handleAllErrors} from "../../../../tools/AllPromiseHandler";
import {removeNulls} from "../../../../tools/ArrayNullRemover";
import {ExternalClientError} from "../../../../error/ExternalClientError";
import {ConcurrentPromiseQueue} from "../../../../tools/ConcurrentPromiseQueue";
import cheerio from "cheerio";
import Root = cheerio.Root;
import Cheerio = cheerio.Cheerio;

const promiseQueue = new ConcurrentPromiseQueue<EbayListingSourceResult>(20);

const extractListingUrl = (url:string, row:Cheerio):string => {
  const linkTag = row.find('a.s-item__link');
  const href = linkTag.attr('href');
  if (!href) {
    throw new ParsingError(`No href found for listing on url: ${url}`);
  }
  return href;
}

const extractSalesType = (url:string, row:Cheerio):EbaySaleType => {

  const BID_REGEX = /(\d+)\s+bids?/gim;
  const BUY_IT_NOW_REGEX = /buy\s+it\s+now/gim;
  const OR_BEST_OFFER_REGEX = /or\s+best\s+offer/gim;
  const BEST_OFFER_ACCEPTED_REGEX = /best\s+offer\s+accepted/gim;

  const bidSpan = row.find('span.s-item__bids.s-item__bidCount');
  const purchaseOptionSpan = row.find('span.s-item__purchase-options-with-icon');
  const purchaseOptionAriaLabel = purchaseOptionSpan.attr('aria-label');
  const purchaseOptionText = purchaseOptionSpan.text();

  const isBid:RegExpMatchArray|null|false = !!bidSpan.text() && BID_REGEX.exec(bidSpan.text());

  const isBuyNow:RegExpMatchArray|null|false =
    (!!purchaseOptionText && purchaseOptionText.match(BUY_IT_NOW_REGEX))
    || (!!purchaseOptionSpan && !!purchaseOptionAriaLabel && purchaseOptionAriaLabel.match(BUY_IT_NOW_REGEX))
    || (!!purchaseOptionSpan && !!purchaseOptionAriaLabel && purchaseOptionAriaLabel.match(OR_BEST_OFFER_REGEX));

  const isBestOffer = (!!purchaseOptionText && purchaseOptionText.match(BEST_OFFER_ACCEPTED_REGEX));

  if (isBid) {
    return EbaySaleType.BID_ACCEPTED
  }
  if (isBuyNow) {
    return EbaySaleType.BUY_IT_NOW
  }
  if (isBestOffer) {
    return EbaySaleType.BEST_OFFER_ACCEPTED
  }

  throw new ParsingError(`Could not determine bid information. Bid text: ${bidSpan.text()}, purchase option text: ${purchaseOptionSpan.text()}, on url: ${url}`);
}

const extractCardListingData = async (url:string, row:Cheerio):Promise<EbayListingSourceResult> => {
  try {
    const listingUrl = extractListingUrl(url, row);
    const saleType = extractSalesType(url, row);
    const listingDetails = await ebayEndedListingDetailsRetriever.retrieve(listingUrl);
    if (!listingDetails.details) {
      return listingDetails;
    }
    // @ts-ignore
    listingDetails.details.saleType = saleType;
    return listingDetails;
  } catch (err:any) {
    if (err instanceof ExternalClientError) {
      if (err.responseStatus === 404) {
        logger.info(`Failed to parse listing: ${err.message}, ${err.requestMethod} - ${err.url} - ${err.responseStatus}`);
        return { details: null, resultType: ResultType.SKIPPED }
      } else {
        logger.error(`Failed to parse listing: ${err.message}, ${err.requestMethod} - ${err.url} - ${err.responseStatus}`);
      }
    } else {
      logger.error(`Failed to parse listing`, err);
    }
    return { details: null, resultType: ResultType.FAILED };
  }
}

const parseListings = async (url:string, $:Root):Promise<Array<EbayListingDetails>> => {
  const cardListingsPromises:Array<Promise<EbayListingSourceResult|null>> = [];
  $('#srp-river-results li.s-item').each(function (this:Cheerio, index, elem) {
    const row:Cheerio = $(this); // eslint-disable-line no-invalid-this
    cardListingsPromises.push(
      promiseQueue.addPromise(() => extractCardListingData(url, row))
      // extractCardListingData(url, row)
    );
  });
  const cardListingResults = removeNulls(await handleAllErrors(
    cardListingsPromises,
    'Card listing failed'
  ));
  // @ts-ignore
  const cardListings:Array<EbayListingDetails> = cardListingResults
    .filter(result => !!result.details)
    .map(result => result.details);
  const failCount = cardListingResults.filter(listing => listing.resultType === ResultType.FAILED).length
  if (cardListings.length === 0 && failCount > 0) {
    logger.error(`Failed all listing on page, might be a sign that the html parsing is broken, url: ${url}`);
  }
  return cardListings;
}

const filterListingsBySearchParams = (listings:Array<EbayListingDetails>, searchParams:SearchParams):Array<EbayListingDetails> => {
  return listings.map(listing => {
    const filteredSoldListings = listing.listings.filter(soldListing => {
      const fullListingName = !!soldListing.variation
        ? `${listing.listingName} ${soldListing.variation}`
        : listing.listingName;
      const validationResult = searchParamValidator.validate(searchParams, fullListingName);
      if (!validationResult.isValid) {
        logger.info(`Filtered: ${listing.listingName} - ${validationResult.reasons.join(', ')}`)
      }
      return validationResult.isValid;
    })
    listing.listings = filteredSoldListings;
    return listing;
  })
    .filter(listing => listing.listings.length > 0);
}

const retrieve = async (url:string, searchParams:SearchParams):Promise<Array<EbayListingDetails>> => {
  const listingsResult = await ebaySoldListingsHtmlClient.getListingsForUrl(url);
  const $ = cheerio.load(listingsResult.htmlPage);

  if ($('#captcha_form').length > 0) {
    logger.error(`Served captcha on url: ${url}`);
    return [];
  }

  const listings = await parseListings(url, $);
  logger.info(`Parsed ${listings.length} listings`)
  const filteredListings = filterListingsBySearchParams(listings, searchParams);
  if (filteredListings.length !== listings.length) {
    logger.info(`Filtered out ${listings.length - filteredListings.length} listings`)
  }
  return filteredListings;
}

const retrieveForUrl = async (url:string):Promise<Array<EbayListingDetails>> => {
  const searchParams = ebayUrlParser.parse(url);
  return retrieve(url, searchParams)
}

export const ebayEndedListingRetriever = {
  retrieve,
  retrieveForUrl,
}