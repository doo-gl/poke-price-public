import {ParsingError} from "../../../../error/ParsingError";
import Root = cheerio.Root;
import Cheerio = cheerio.Cheerio;

export interface SalesInfo {
  numberOfSales:number|null,
  salesUrl:string,
  numberOfBids:number|null,
}

const getSalesAnchor = ($:Root):Cheerio => {
  const salesAnchor = $('span.vi-qtyS.vi-qty-pur-lnk').children('a');
  const salesHotAnchor = $('span.vi-qtyS-hot.vi-qty-pur-lnk').children('a');
  const salesHotRedAnchor = $('span.vi-qtyS-hot-red.vi-qty-pur-lnk').children('a');
  if (salesAnchor.length > 0) {
    return salesAnchor;
  } else if (salesHotAnchor.length > 0) {
    return salesHotAnchor;
  } else {
    return salesHotRedAnchor;
  }
}

const extractNumberSold = (url:string, $:Root):number|null => {
  const salesAnchor = getSalesAnchor($)
  if (salesAnchor.length === 0) {
    return null;
  }
  if (salesAnchor.length > 1) {
    throw new ParsingError(`Found more than 1 sales anchor on ${url}, matching "$('span.vi-qtyS.vi-qty-pur-lnk').children('a')"`)
  }
  const numberSoldString = salesAnchor.text().trim();
  const matches = new RegExp(/([\d]+)[\s]+sold/gim).exec(numberSoldString)
  if (!matches) {
    return null;
  }
  if (matches.length < 2) {
    throw new ParsingError(`Expected at least 2 sold matches, actual: ${matches.join(',')}, on url: ${url}`)
  }
  return Number.parseInt(matches[1]);
}

const extract = (url:string, $:Root):string|null => {
  const salesAnchor = getSalesAnchor($)
  if (salesAnchor.length === 0) {
    return null;
  }
  if (salesAnchor.length > 1) {
    throw new ParsingError(`Found more than 1 sales anchor on ${url}, matching "$('span.vi-qtyS.vi-qty-pur-lnk').children('a')"`)
  }
  const salesUrl = salesAnchor.attr('href');
  if (!salesUrl) {
    throw new ParsingError(`Sales anchor does not have a href on url: ${url}`);
  }
  return salesUrl;
}

export const salesUrlExtractor = {
  extract,
  extractNumberSold,
}