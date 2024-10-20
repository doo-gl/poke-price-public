import {CurrencyAmountLike} from "../../../money/CurrencyAmount";
import {Moment} from "moment";
import {ebaySoldListingsHtmlClient, SoldListingResult} from "../../../../client/EbaySoldListingsHtmlClient";
import cheerio from "cheerio";
import {UnexpectedError} from "../../../../error/UnexpectedError";
import {finishedListingDetailsParser} from "./FinishedListingDetailsParser";
import {ParsingError} from "../../../../error/ParsingError";
import {liveListingDetailsParser} from "./LiveListingDetailsParser";
import Root = cheerio.Root;
import {EbaySaleType} from "../EbayCardListingSearcher";
import {logger} from "firebase-functions";

export enum ResultType {
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export interface EbayListingSourceResult {
  details:PartialEbayListingDetails|EbayListingDetails|null,
  resultType:ResultType,
}

export interface EbayListingDetails extends PartialEbayListingDetails {
  saleType:EbaySaleType,
}

export interface PartialEbayListingDetails {
  listingName:string,
  itemId:string,
  originalListingUrl:string|null,
  salesHistoryUrl:string|null,
  listings:Array<SoldListings>,
  soldCount:number|null,
  imageUrl:string,
}

export interface SoldListings {
  amount:CurrencyAmountLike,
  timestamp:Moment,
  listingUrl:string,
  variation:string|null,
  bidCount:number|null,
}

const IS_FINISHED_REGEX = /(This listing has ended|This listing was ended|Bidding has ended|Bidding was ended|This Buy it now listing has ended.)/gim;
const isFinishedListing = (url:string, $:Root):boolean => {
  const messageSpan = $('div#msgPanel').find('span.msgTextAlign');
  if (messageSpan.length === 0) {
    return false;
  }
  if (messageSpan.length > 1) {
    throw new ParsingError(`Found multiple matches for "$('div#msgPanel').find('span.msgTextAlign')" in url ${url}`)
  }
  const message = messageSpan.text();
  const isFinished = !!message.match(IS_FINISHED_REGEX);
  return isFinished;
}

const isLiveListing = (url:string, $:Root):boolean => {
  const quantitySpan = $('input#qtyTextBox');
  if (quantitySpan.length > 1) {
    throw new ParsingError(`Found ${quantitySpan.length} quantity boxes at url: ${url}`)
  }
  return quantitySpan.length > 0;
}

const IS_OUT_OF_STOCK_REGEX = /(This item is out of stock)/gim;
const isOutOfStockListing = (url:string, $:Root):boolean => {
  const messageSpan = $('div#msgPanel').find('span.msgTextAlign');
  if (messageSpan.length === 0) {
    return false;
  }
  if (messageSpan.length > 1) {
    throw new ParsingError(`Found multiple matches for "$('div#msgPanel').find('span.msgTextAlign')" in url ${url}`)
  }
  const message = messageSpan.text();
  const isOutOfStock = !!message.match(IS_OUT_OF_STOCK_REGEX);
  return isOutOfStock;
}

const retrieve = async (url:string):Promise<EbayListingSourceResult> => {
  const soldListingResult:SoldListingResult = await ebaySoldListingsHtmlClient.getListingsForUrl(url);
  const $ = cheerio.load(soldListingResult.htmlPage);
  if (isOutOfStockListing(url, $)) {
    logger.info(`Listing ${url} is out of stock and will be skipped`);
    return { details: null, resultType: ResultType.SKIPPED };
  }
  if (isLiveListing(url, $)) {
    logger.info(`Listing ${url} is still live and won't be added until it is finished`);
    return { details: null, resultType: ResultType.SKIPPED };
    // return liveListingDetailsParser.parse(url, $);
  }
  if (isFinishedListing(url, $)) {
    const details = await finishedListingDetailsParser.parse(url, $)
    return { details, resultType: ResultType.SUCCESSFUL  };
  }
  throw new UnexpectedError(`Listing at url ${url}, is neither live nor finished`)
}

export const ebayEndedListingDetailsRetriever = {
  retrieve,
}