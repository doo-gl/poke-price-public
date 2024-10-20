import Cheerio = cheerio.Cheerio;
import {OpenListing} from "./EbayOpenListingParser";
import {ParsingError} from "../../../../error/ParsingError";
import {itemIdExtractor} from "../ended-listing-retrieval/ItemIdExtractor";
import {queryString} from "../../../../external-lib/QueryString";
import {openListingDetailPageParser} from "./OpenListingDetailPageParser";
import {ebayOpenListingRetriever} from "../../open-listing/EbayOpenListingRetriever";
import {logger} from "firebase-functions";

const shouldSkip = (url:string, listing:Cheerio):boolean => {

  // skip entries with prices like as £1.39 to £4.55
  const toSpan = listing.find('span.s-item__price').find('span');
  if (toSpan.length > 0 && toSpan.text().trim().toLowerCase() === 'to') {
    return true;
  }

  return false
}

const extractListingUrl = (url:string, listing:Cheerio):string => {
  const anchor = listing.find('a.s-item__link');
  if (anchor.length === 0) {
    throw new ParsingError(`No anchor matching "a.s-item__link" in listing on url: ${url}`)
  }
  if (anchor.length > 1) {
    throw new ParsingError(`${anchor.length} anchors matching "a.s-item__link" in listing on url: ${url}`)
  }
  const href = anchor.attr('href');
  if (!href) {
    throw new ParsingError(`Anchor missing href at url: ${url}`);
  }
  return queryString.parseUrl(href).url
}

const extractListingName = (url:string, id:string, listing:Cheerio):string => {
  const titleTag = listing.find('div.s-item__title');
  if (titleTag.length === 0) {
    throw new ParsingError(`No tag found matching "div.s-item__title" at url: ${url}, itemId: ${id}`);
  }
  if (titleTag.length > 1) {
    throw new ParsingError(`${titleTag.length} tags matching "div.s-item__title" in listing on url: ${url}, itemId: ${id}`)
  }
  const titleText = titleTag.contents().not('span.LIGHT_HIGHLIGHT').text();
  if (!titleText || titleText.trim().length === 0) {
    throw new ParsingError(`No title text on url: ${url}, itemId: ${id}`)
  }
  return titleText;
}

const extractBidCount = (url:string, id:string, listing:Cheerio):number|null => {
  const bidCountSpan = listing.find('span.s-item__bids.s-item__bidCount');
  if (bidCountSpan.length === 0) {
    return null;
  }
  if (bidCountSpan.length > 1) {
    throw new ParsingError(`${bidCountSpan.length} tags matching "span.s-item__bids.s-item__bidCount" in listing on url: ${url}, itemId: ${id}`)
  }
  const bidCountText = bidCountSpan.text();
  const bidCount = Number(
    bidCountText.replace('bids', '').replace('bid', '').trim()
  );
  if (bidCount === Number.NaN) {
    throw new ParsingError(`Failed to pull bid count from ${bidCountText} on url: ${url}, itemId: ${id}`)
  }
  return bidCount;
}

const parse = async (url:string, listing:Cheerio):Promise<OpenListing|null> => {
  if (shouldSkip(url, listing)) {
    return null;
  }
  const listingUrl = extractListingUrl(url, listing);
  const listingId = itemIdExtractor.extract(listingUrl);

  const preExistingListing = await ebayOpenListingRetriever.retrieveByListingId(listingId)
  if (preExistingListing) {
    logger.info(`Found pre-existing listing for url: ${listingUrl}, mapped to listing: ${preExistingListing.id}, not sourcing again.`)
    return null
  }

  const listingName = extractListingName(url, listingId, listing);
  // const bidCount = extractBidCount(url, listingId, listing);
  const details = await openListingDetailPageParser.parse(listingUrl);
  return {
    listingName,
    price: details.price,
    buyItNowPrice: details.buyItNowPrice,
    listingTypes: details.listingTypes,
    bidCount: details.bidCount,
    endTime: details.endTime,
    url: listingUrl,
    id: listingId,
    imageUrls: details.imageUrls,
    searchUrl: url,
    description: details.description,
    listingSpecifics: details.listingSpecifics,
    sellersNotes: details.sellersNotes,
  }
}

export const openListingDetailParser = {
  parse,
}