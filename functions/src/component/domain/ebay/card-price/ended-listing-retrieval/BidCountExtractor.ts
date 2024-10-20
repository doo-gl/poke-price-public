import Root = cheerio.Root;
import {ParsingError} from "../../../../error/ParsingError";
import {textExtractor} from "./TextExtractor";
import Cheerio = cheerio.Cheerio;

const findBidTag = ($:Root):Cheerio => {
  const matchers = [
    () => $('.vi-bid-history-near-price').find('#vi-VR-bid-lnk'),
    () => $('.vi-bid-history-near-price').find('#vi-VR-bid-lnk-qty-test'),
    () => $('.vi-bid-history-near-price').find('#vi-VR-bid-lnk-qty-test_min'),
    // () => $('.vi-bid-history-near-price').find('.vi-bidC.vi-VR-bid-lnk'),
    () => $('.vi-cvip-bidt1').find('#vi-VR-bid-lnk'),
    () => $('.vi-cvip-bidt1').find('#vi-VR-bid-lnk-'),
    () => $('.vi-cvip-bidt1').find('.vi-VR-bid-lnk'),
    () => $('.x-buybox__cta-section').find('.x-bid-count').find('.ux-textspans'),
  ]
  for (let matchIndex = 0; matchIndex < matchers.length; matchIndex++) {
    const matcher = matchers[matchIndex];
    const bidTag = matcher();
    if (bidTag.length > 0) {
      return bidTag;
    }
  }
  return matchers[0]();
}

const extract = (url:string, $:Root):number|null => {
  const bids = findBidTag($)
  if (bids.length === 0) {
    return null;
  }
  if (bids.length > 1) {
    throw new ParsingError(`Found ${bids.length} bid counts at url: ${url}`);
  }
  const bidCountString = textExtractor.extractFromCheerio(bids)
    .replace('bids', '')
    .replace('bid', '')
    .trim();
  if (!bidCountString || bidCountString === '') {
    throw new ParsingError(`Cannot find bid count string at url: ${url}`);
  }
  const bidCount = Number(bidCountString);
  if (!Number.isSafeInteger(bidCount)) {
    throw new ParsingError(`Cannot parse bid count string ${bidCountString} as number at url: ${url}`);
  }
  return bidCount;
}

export const bidCountExtractor = {
  extract,
}