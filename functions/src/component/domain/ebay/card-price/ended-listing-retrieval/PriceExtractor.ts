import {CurrencyAmountLike} from "../../../money/CurrencyAmount";
import {ParsingError} from "../../../../error/ParsingError";
import {priceConverter} from "./PriceConverter";
import Root = cheerio.Root;
import Cheerio = cheerio.Cheerio;


const findPriceSpan = ($:Root):Cheerio => {
  const matchers = [
    () => $('div.vi-price').find('span#prcIsum_bidPrice'),
    () => $('div.vi-price').find('span#prcIsum'),
    () => $('div.vi-price-np').find('span.vi-VR-cvipPrice'),
    () => $('div#bb_bdp').find('span#mm-saleDscPrc'),
    () => $('div.x-buybox__price-section').find('div.x-bid-price').find('div.x-price-primary').find('span.ux-textspans'),
    () => $('div.x-buybox__price-section').find('div.x-bin-price').find('div.x-price-primary').find('span.ux-textspans'),
  ]
  for (let matchIndex = 0; matchIndex < matchers.length; matchIndex++) {
    const matcher = matchers[matchIndex];
    const priceSpan = matcher();
    if (priceSpan.length > 0) {
      return priceSpan;
    }
  }
  return matchers[0]();
}

const extract = (url:string, $:Root):CurrencyAmountLike => {
  const priceSpan = findPriceSpan($);
  if (priceSpan.length === 0) {
    throw new ParsingError(`Failed to find price at url: ${url}, matching "div.vi-price span#prcIsum"`);
  }
  if (priceSpan.length > 1) {
    throw new ParsingError(`Found multiple prices at url: ${url}, matching "div.vi-price span#prcIsum"`);
  }
  return priceConverter.convert(url, priceSpan.text())
}

export const priceExtractor = {
  extract,
}