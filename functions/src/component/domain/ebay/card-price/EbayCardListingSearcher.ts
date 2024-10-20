import {ebaySoldListingsHtmlClient, SoldListingResult} from "../../../client/EbaySoldListingsHtmlClient";
import cheerio from "cheerio";
import moment, {Moment} from "moment";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {logger} from "firebase-functions";
import {queryString} from "../../../external-lib/QueryString";
import {CurrencyAmount} from "../../money/CurrencyAmount";
import {EbayCardSearchParamEntity, SearchParams} from "../search-param/EbayCardSearchParamEntity";
import Cheerio = cheerio.Cheerio;
import Root = cheerio.Root;
import Element = cheerio.Element;
import {ebaySearchUrlCreator} from "../search-param/EbaySearchUrlCreator";

export enum EbaySaleType {
  BID_ACCEPTED = 'BID_ACCEPTED',
  BEST_OFFER_ACCEPTED = 'BEST_OFFER_ACCEPTED',
  BUY_IT_NOW = 'BUY_IT_NOW',
}

export type EbayCardListing = {
  dateListingEnded:Moment,
  priceAmount:CurrencyAmount,
  ebayLink:string,
  ebayId:string,
  listingName:string,
  bidCount:number|null,
  saleType:EbaySaleType,
}

export type EbayCardListingResult = {
  searchUrl:string,
  searchParams:SearchParams,
  cardListings:Array<EbayCardListing>,
}

type EbayIdentifiers = {
  ebayId: string,
  ebayListingUrl:string,
}

type EbayBidInformation = {
  saleType:EbaySaleType,
  bidCount:number|null,
}

enum ParsingIssueType {
  MISSING_INFORMATION = 'MISSING_INFORMATION',
  WRONG_FORMAT = 'WRONG_FORMAT',
  UNKNOWN = 'UNKNOWN',
}

class ParsingIssue {
  readonly isParsingIssue = true;
  constructor(
    readonly type: ParsingIssueType,
    readonly message:string,
  ) {
  }
}

interface MaskingSpans {
  showClass?:string,
  hideClass?:string,
}

const extractTitleDateString = (row:Cheerio, maskingSpans:MaskingSpans):{ value:string, isParsingIssue:false }|ParsingIssue => {
  const easyTitleDiv = row.find('div.s-item__title--tagblock span.s-item__title--tagblock__COMPLETED');
  const easyTitleDateString:string = easyTitleDiv.text()
    .replace(/Sold|item/gim, '')
    .trim();
  if (easyTitleDiv.length !== 0 && easyTitleDateString && easyTitleDateString.length > 0) {
    return { value: easyTitleDateString, isParsingIssue: false };
  }

  if (!maskingSpans.showClass && !maskingSpans.hideClass) {
    return new ParsingIssue(ParsingIssueType.MISSING_INFORMATION, 'No easy title div or masking');
  }

  const contentSpans = maskingSpans.showClass
    ? row.find('div.s-item__title--tagblock').find(`span.${maskingSpans.showClass}`)
    : row.find('div.s-item__title--tagblock').find('span').not(`span.${maskingSpans.hideClass}`).not('span.POSITIVE');

  let result = '';
  contentSpans.each((index:number, element:Element) => {
    // @ts-ignore
    const data = element && element.children && element.children[0] ? element.children[0].data : null;
    if (data) {
      result = result + data
    }
  })
  result = result
    .replace(/Sold|item/gim, '')
    .replace(/[\s]{2,}/gim, ' ')
    .trim()
  return {
    value: result,
    isParsingIssue: false,
  };
}

const TITLE_DATE_FORMAT = 'D MMM YYYY';
const extractDateListingEnded = ($:Root, row:Cheerio, maskingSpans:MaskingSpans):Moment|ParsingIssue => {
  const titleDateString = extractTitleDateString(row, maskingSpans);
  if (titleDateString.isParsingIssue) {
    return titleDateString
  }
  if (!moment(titleDateString.value, TITLE_DATE_FORMAT, true).isValid()) {
    return new ParsingIssue(ParsingIssueType.WRONG_FORMAT, `Title date does not match format: ${TITLE_DATE_FORMAT}, actual string: ${titleDateString.value}`);
  }
  const titleDate:Moment = moment(titleDateString.value, TITLE_DATE_FORMAT, true);
  return titleDate;
}

const extractPrice = ($:Root, row:Cheerio):CurrencyAmount|ParsingIssue => {
  const itemPriceDiv = row.find('span.s-item__price');
  if (!itemPriceDiv.text()) {
    return new ParsingIssue(ParsingIssueType.MISSING_INFORMATION, `No pricing div found`);
  }
  const itemPriceString = itemPriceDiv.text().replace(/\s/gim, '');
  if (!itemPriceString.startsWith('£')) {
    return new ParsingIssue(ParsingIssueType.WRONG_FORMAT, `Expected item price to start with £, actual: ${itemPriceString}`);
  }
  if (itemPriceString.match(/[a-zA-Z]/)) {
    return new ParsingIssue(ParsingIssueType.WRONG_FORMAT, `Expected item price to not contain word characters, actual: ${itemPriceString}`);
  }
  let amountInPence = 0;
  const priceAmountString = itemPriceString.slice(1);
  try {
    const amountInPounds = Number.parseFloat(priceAmountString);
    amountInPence = Math.trunc(amountInPounds * 100);
  } catch (e) {
    return new ParsingIssue(ParsingIssueType.WRONG_FORMAT, `Failed to parse as price amount: ${priceAmountString}`);
  }
  return new CurrencyAmount(amountInPence, CurrencyCode.GBP);
}

const extractEbayIdentifiers = ($:Root, row:Cheerio):EbayIdentifiers|ParsingIssue => {
  const linkTag = row.find('a.s-item__link');
  const href = linkTag.attr('href');
  if (!href) {
    return new ParsingIssue(ParsingIssueType.MISSING_INFORMATION, `No href found for listing`);
  }
  const parsedUrl = queryString.parseUrl(href);
  const splitUrl = parsedUrl.url.split('/');
  const ebayId = splitUrl[splitUrl.length - 1];
  return {
    ebayId: ebayId,
    ebayListingUrl: parsedUrl.url,
  };
}


const extractBidInformation = ($:Root, row:Cheerio):EbayBidInformation|ParsingIssue => {

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
    const match:RegExpMatchArray = isBid;
    const bidCount = Number(match[1]);
    return {
      saleType: EbaySaleType.BID_ACCEPTED,
      bidCount,
    }
  }
  if (isBuyNow) {
    return {
      saleType: EbaySaleType.BUY_IT_NOW,
      bidCount: null,
    }
  }
  if (isBestOffer) {
    return {
      saleType: EbaySaleType.BEST_OFFER_ACCEPTED,
      bidCount: null,
    }
  }

  return new ParsingIssue(ParsingIssueType.MISSING_INFORMATION, `Could not determine bid information. Bid text: ${bidSpan.text()}, purchase option text: ${purchaseOptionSpan.text()}`);
}

const extractListingName = ($:Root, row:Cheerio):string|ParsingIssue => {
  const titleTag = row.find('h3.s-item__title');
  const titleText = titleTag.text();
  if (!titleText) {
    return new ParsingIssue(ParsingIssueType.MISSING_INFORMATION, `No title available for listing`);
  }
  return titleText;
}

const extractCardListingData = ($:Root, row:Cheerio, maskingSpans:MaskingSpans):EbayCardListing|null => {

  const extractedCardData = {
    dateListingEnded: extractDateListingEnded($, row, maskingSpans),
    price: extractPrice($, row),
    ebayIdentifiers: extractEbayIdentifiers($, row),
    bidInformation: extractBidInformation($, row),
    listingName: extractListingName($, row),
  }
  const parsingIssues = Object.values(extractedCardData).filter((data:any) => data.isParsingIssue);
  if (parsingIssues.length > 0) {
    logger.error("Failed to parse an ebay listing", extractedCardData);
    return null;
  }
  const dateListingEnded:Moment = <Moment>extractedCardData.dateListingEnded;
  const price:CurrencyAmount = <CurrencyAmount>extractedCardData.price;
  const ebayIdentifiers = <EbayIdentifiers>extractedCardData.ebayIdentifiers;
  const bidInformation = <EbayBidInformation>extractedCardData.bidInformation;
  const listingName = <string>extractedCardData.listingName;
  return {
    dateListingEnded,
    priceAmount: price,
    ebayLink: ebayIdentifiers.ebayListingUrl,
    ebayId: ebayIdentifiers.ebayId,
    bidCount: bidInformation.bidCount,
    saleType: bidInformation.saleType,
    listingName,
  }
}

const extractMaskingSpans = ($:Root):MaskingSpans => {
  const result:MaskingSpans = {};
  $('style').filter((index:number, element:Element) => {
    const SPAN_REGEX = /span\.s-[\w\d]+/gm;
    const INLINE_REGEX = /.*inline.*/gm;
    const NONE_REGEX = /.*none.*/gm;
    // @ts-ignore
    const data = element && element.children && element.children[0] ? element.children[0].data : null;
    if (!data) {
      return false
    }
    const spanMatches = data.match(SPAN_REGEX);
    const inlineMatches = data.match(INLINE_REGEX);
    const noneMatches = data.match(NONE_REGEX);
    return !!spanMatches && spanMatches.length === 2
      && !!inlineMatches && inlineMatches.length === 1
      && !!noneMatches && noneMatches.length === 1;
  })
    .each((index:number, element:Element) => {
      // @ts-ignore
      const data = element && element.children && element.children[0] ? element.children[0].data : null;
      if (!data) {
        return;
      }
      const SPAN_CLASS_REGEX = /s-[\w\d]+/gm;
      const DISPLAY_REGEX = /display:\s+(inline|none);/gm
      const spanClassMatches = data.match(SPAN_CLASS_REGEX);
      const displayMatches = data.match(DISPLAY_REGEX);
      if (spanClassMatches.length !== 2 || displayMatches.length !== 2) {
        return;
      }
      for (let matchIndex = 0; matchIndex < spanClassMatches.length; matchIndex++) {
        const spanClass = spanClassMatches[matchIndex];
        const display = displayMatches[matchIndex];
        const isDisplayInline = !!display.match('inline');
        const isDisplayNone = !!display.match('none');
        if (isDisplayInline) {
          result.showClass = spanClass;
        }
        if (isDisplayNone) {
          result.hideClass = spanClass;
        }
      }
    })
  return result;
}

const parseCardListingPage = (soldListingResult:SoldListingResult):{cardListings:Array<EbayCardListing>, ignoreCount:number} => {
  const $ = cheerio.load(soldListingResult.htmlPage);
  const cardListings:Array<EbayCardListing> = [];
  let ignoreCount = 0;
  const maskingSpans = extractMaskingSpans($);
  $('#srp-river-results li.s-item').each(function (this:Cheerio, index, elem) {
    // see https://github.com/typescript-eslint/typescript-eslint/issues/604
    const row:Cheerio = $(this); // eslint-disable-line no-invalid-this

    let ebayCardListing:EbayCardListing|null = null;
    try {
      ebayCardListing = extractCardListingData($, row, maskingSpans);
    } catch (e) {
      logger.error(`Unexpected Error while parsing ebay listings`, e);
    }
    if (ebayCardListing === null) {
      ignoreCount++;
      return;
    }
    cardListings.push(ebayCardListing);
  });
  return {
    cardListings,
    ignoreCount,
  };
}

const search = async (searchParams:EbayCardSearchParamEntity):Promise<EbayCardListingResult> => {
  const url = ebaySearchUrlCreator.create(searchParams);
  return searchUrl(url);
}

const searchUrl = async (url:string):Promise<EbayCardListingResult> => {
  const soldListingResult:SoldListingResult = await ebaySoldListingsHtmlClient.getListingsForUrl(url);
  const results = parseCardListingPage(soldListingResult);
  let cardListings:Array<EbayCardListing> = results.cardListings;
  if (cardListings.length === 0 && results.ignoreCount > 0) {
    logger.error(`Warning, ignored all listing on page, might be a sign that the html parsing is broken, going to retry, full url: ${soldListingResult.fullUrl}`);
    const retryListingResult:SoldListingResult = await ebaySoldListingsHtmlClient.getListingsForUrl(url);
    const retryResults = parseCardListingPage(retryListingResult);
    if (retryResults.cardListings.length === 0 && retryResults.ignoreCount > 0) {
      logger.error(`Retry on url: ${soldListingResult.fullUrl}, also failed to produce listings`);
    }
    cardListings = retryResults.cardListings;
  }
  return Promise.resolve({
    searchUrl: soldListingResult.fullUrl,
    searchParams: {includeKeywords:[], excludeKeywords:[]},
    cardListings,
  });
}


export const ebayCardListingSearcher = {
  search,
  searchUrl,
}