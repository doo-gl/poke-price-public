import {SoldListings} from "./EbayEndedListingDetailsRetriever";
import {ebaySoldListingsHtmlClient} from "../../../../client/EbaySoldListingsHtmlClient";
import cheerio from "cheerio";
import {ParsingError} from "../../../../error/ParsingError";
import {CurrencyAmountLike} from "../../../money/CurrencyAmount";
import moment, {Moment} from "moment-timezone";
import {priceConverter} from "./PriceConverter";
import Root = cheerio.Root;
import Cheerio = cheerio.Cheerio;
import Element = cheerio.Element;
import {EbaySecurityMeasureError} from "../../../../error/EbaySecurityMeasureError";


const validateSecurityMeasure = (url:string, $:Root):void => {
  const titleTag = $('title');
  if (!titleTag || titleTag.length === 0) {
    return;
  }
  const titleText = titleTag.text();
  const isSecurityMeasure = !!titleText.match(/Security Measure/gim)
  if (isSecurityMeasure) {
    throw new EbaySecurityMeasureError(`Hit secure measure page at url: ${url}`)
  }
}

const extractPurchaseHistoryTable = (url:string, $:Root):Cheerio => {
  const tables = $('table');
  const tablesWithHeaderText = tables.filter(function (this:Cheerio, index, element) {
    const table = $(this); // eslint-disable-line no-invalid-this
    return table.find('th.tabHeadDesignFont').length > 0 && table.find('table').length === 0;
  });
  if (tablesWithHeaderText.length === 0) {
    throw new ParsingError(`Failed to find purchase history table at url: ${url}`)
  }
  return tablesWithHeaderText.eq(0);
}

const extractText = (element:Element|null):string|undefined => {
  if (!element) {
    return '';
  }
  if (element.type === 'text') {
    return element.data
  }
  // @ts-ignore
  if (element.children.length === 0) {
    return ''
  }
  // @ts-ignore
  return element.children.map(el => extractText(el)).join('');
}

const parseHeaders = (url:string, purchaseHistoryTable:Cheerio):Array<string> => {
  const headerTags = purchaseHistoryTable.find('.tabHeadDesignFont');
  if (headerTags.length === 0) {
    throw new ParsingError(`Found no tab headers at url: ${url}`);
  }
  const headers = headerTags.toArray().map((element:Element) => {
    const text = extractText(element);
    return text ? text.trim().toLowerCase() : undefined;
  });
  if (headers.some(header => !header)) {
    throw new ParsingError(`Some headers are missing in url: ${url}, headers: ${headers.join(',')}`)
  }
  // @ts-ignore
  return headers;
}

const getIndexOf = (values:Array<string>, searchKeys:Array<string>):number|null => {
  for (let index = 0; index < searchKeys.length; index++) {
    const searchKey = searchKeys[index];
    const foundIndex = values.indexOf(searchKey);
    if (foundIndex !== -1) {
      return foundIndex;
    }
  }
  return null;
}

const parsePrice = (url:string, cellTag:Cheerio):CurrencyAmountLike|null => {
  const priceString = cellTag.text().trim().replace(/\s+/gim, '');
  if (!priceString) {
    throw new ParsingError(`Found an empty price string at url: ${url}`);
  }
  if (priceString.match(/(soldasaspecialoffer|accepted)/gim)) {
    return null;
  }
  return priceConverter.convert(url, priceString);
}

const parseQuantity = (url:string, cellTag:Cheerio):number => {
  const quantityString = cellTag.text().trim();
  return Number.parseInt(quantityString);
}

const parseTimestamp = (url:string, cellTag:Cheerio):Moment => {
  const timestampString = cellTag.text().trim();
  const splitTime = timestampString.split(' ');
  if (splitTime.length !== 3) {
    throw new ParsingError(`Unexpected split of string ${timestampString}, expected 3 parts, in url: ${url}`);
  }
  const timeString = `${splitTime[0]}T${splitTime[1]}`;
  const timezone = splitTime[2];
  const format = 'DD-MMM-YYTHH:mm:ss'
  const timestamp = moment(timeString, format, true).tz(timezone);
  if (!timestamp.isValid()) {
    throw new ParsingError(`Failed to parse time string: ${timeString}, with format: ${format}, at url: ${url}`)
  }
  return timestamp;
}

const parseVariation = (url:string, cellTag:Cheerio):string|null => {
  if (cellTag.length === 0 || cellTag.contents().length === 0) {
    return null;
  }
  const variationString = cellTag.find('b').text();
  if (!variationString || variationString === '') {
    throw new ParsingError(`Could not parse variation when expecting one on url: ${url}`)
  }
  return variationString;
}

const parseRow = (url:string, row:Cheerio, headers:Array<string>):Array<SoldListings> => {
  const allCellTags = row.find('td');
  const cellTags = allCellTags.slice(1, allCellTags.length - 1)
  if (cellTags.length !== headers.length) {
    throw new ParsingError(`Mismatch of cell and header lengths at url: ${url}, cell length: ${cellTags.length}, header length: ${headers.length}`)
  }
  const priceIndex = getIndexOf(headers, ['price', 'buy it now price', 'offer status']);
  const quantityIndex = getIndexOf(headers, ['quantity']);
  const timestampIndex = getIndexOf(headers, ['date of purchase', 'date of offer']);
  const variationIndex = getIndexOf(headers, ['variation']);
  if (!priceIndex) {
    throw new ParsingError(`Failed to find price header at url: ${url}`);
  }
  if (!quantityIndex) {
    throw new ParsingError(`Failed to find quantity header at url: ${url}`);
  }
  if (!timestampIndex) {
    throw new ParsingError(`Failed to find timestamp header at url: ${url}`);
  }
  const price = parsePrice(url, cellTags.eq(priceIndex));
  if (!price) {
    return [];
  }
  const quantity = parseQuantity(url, cellTags.eq(quantityIndex));
  const timestamp = parseTimestamp(url, cellTags.eq(timestampIndex));
  const variation = !!variationIndex
    ? parseVariation(url, cellTags.eq(variationIndex))
    : null;

  const listings:Array<SoldListings> = [];
  for (let listingCount = 0; listingCount < quantity; listingCount++) {
    listings.push({
      timestamp,
      amount: price,
      listingUrl: url,
      bidCount: null,
      variation,
    });
  }
  return listings;
}

const parsePurchaseHistory = (url:string, $:Root, purchaseHistoryTable:Cheerio, headers:Array<string>):Array<SoldListings> => {
  const rowTags = purchaseHistoryTable.find('tr').slice(1);
  let listings:Array<SoldListings> = [];
  rowTags.each(function (this:Cheerio, index, element) {
    const row = $(this); // eslint-disable-line no-invalid-this

    const hasNoContent = row.find('td.contentValueFont').length === 0;
    if (hasNoContent) {
      return;
    }

    const listingsFromRow = parseRow(url, row, headers);
    listings = listings.concat(listingsFromRow);
  })
  return listings;
}

const parse = async (url:string):Promise<Array<SoldListings>> => {
  const pageResult = await ebaySoldListingsHtmlClient.getListingsForUrl(url);
  const $ = cheerio.load(pageResult.htmlPage);
  validateSecurityMeasure(url, $)
  const purchaseHistoryTable = extractPurchaseHistoryTable(url, $);
  const headers = parseHeaders(url, purchaseHistoryTable);
  const listings = parsePurchaseHistory(url, $, purchaseHistoryTable, headers);
  return listings;
}

export const salesHistoryDetailsParser = {
  parse,
}