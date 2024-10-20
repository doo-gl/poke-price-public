import moment, {Moment} from "moment-timezone";
import {ParsingError} from "../../../../error/ParsingError";
import {listingNameExtractor} from "./ListingNameExtractor";
import {itemIdExtractor} from "./ItemIdExtractor";
import {salesUrlExtractor} from "./SalesUrlExtractor";
import {priceExtractor} from "./PriceExtractor";
import {queryString} from "../../../../external-lib/QueryString";
import Root = cheerio.Root;
import {PartialEbayListingDetails} from "./EbayEndedListingDetailsRetriever";
import {timestampExtractor} from "./TimestampExtractor";

const getOriginalListingUrl = (url:string, $:Root):string|null => {
  const originalListingAnchor = $('span.vi-original-listing').find('a');
  if (originalListingAnchor.length === 0) {
    return null;
  }
  if (originalListingAnchor.length > 1) {
    throw new ParsingError(`Found more than 1 original listing anchor on ${url}, matching "span.vi-original-listing a"`);
  }
  const listingUrl = originalListingAnchor.attr('href');
  if (!listingUrl) {
    return null;
  }
  return queryString.parseUrl(listingUrl).url;
}

const extractBids = (url:string, $:Root):number|null => {
  const bidAnchor = $('a#vi-VR-bid-lnk');
  if (!bidAnchor || bidAnchor.length === 0) {
    return null
  }
  if (bidAnchor.length > 1) {
    throw new ParsingError(`Found more than 1 bid anchor on ${url}, matching "a#vi-VR-bid-lnk"`);
  }
  const bidString = bidAnchor.children('span').first().text().trim();
  const bidCount = Number.parseInt(bidString);
  return bidCount;
}

const extractImageUrl = (url:string, $:Root):string => {
  const imageTag = $('img#icImg');
  if (imageTag.length === 0) {
    throw new ParsingError(`Found no image tag on ${url}, matching "$('img#icImg')"`);
  }
  if (imageTag.length > 1) {
    throw new ParsingError(`Found ${imageTag.length} image tags on ${url}, matching "$('img#icImg')"`);
  }
  const src = imageTag.attr('src');
  if (!src) {
    throw new ParsingError(`Image tag has no src on url: ${url}`);
  }
  return src;
}

const parse = async (url:string, $:Root):Promise<PartialEbayListingDetails> => {
  const salesHistoryUrl = salesUrlExtractor.extract(url, $);

  const listingName = listingNameExtractor.extract(url, $);
  const itemId = itemIdExtractor.extract(url);
  const originalListingUrl = getOriginalListingUrl(url, $);
  const amount = priceExtractor.extract(url, $);
  const timestamp = timestampExtractor.extract(url, $);
  const bids = extractBids(url, $);
  const solds = salesUrlExtractor.extractNumberSold(url, $);
  const imageUrl = extractImageUrl(url, $);

  return {
    listingName,
    itemId,
    originalListingUrl,
    salesHistoryUrl,
    imageUrl,
    soldCount: solds,
    listings: [{
      amount,
      timestamp,
      bidCount: bids,
      listingUrl: url,
      variation: null,
    }],
  }
}

export const finishedListingDetailsParser = {
  parse,
}