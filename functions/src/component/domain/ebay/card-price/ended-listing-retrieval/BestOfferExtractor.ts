import {ParsingError} from "../../../../error/ParsingError";
import Root = cheerio.Root;
import Cheerio = cheerio.Cheerio;

const findBestOfferElement = ($:Root):Cheerio => {
  const matchers = [
    () => $('div.vi-price').find('div.vi-boLabel'),
    () => $('div.vi-price').find('span#vi-boPrcLblbubble'),
  ]
  for (let matchIndex = 0; matchIndex < matchers.length; matchIndex++) {
    const matcher = matchers[matchIndex];
    const bestOfferElement = matcher();
    if (bestOfferElement.length > 0) {
      return bestOfferElement;
    }
  }
  return matchers[0]();
}

const isBestOfferAccepted = (url:string, $:Root):boolean => {
  const bestOfferElement = findBestOfferElement($);
  if (bestOfferElement.length === 0) {
    return false
  }
  if (bestOfferElement.length > 1) {
    throw new ParsingError(`Found best offer multiple elements at url: ${url}"`);
  }
  return true
}

export const bestOfferExtractor = {
  isBestOfferAccepted,
}