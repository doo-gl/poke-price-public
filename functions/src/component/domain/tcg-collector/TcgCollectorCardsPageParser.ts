import cheerio from "cheerio";
import Root = cheerio.Root;
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {UnexpectedError} from "../../error/UnexpectedError";

export interface CardsPageParseResult {
  cardUrls:Array<string>,
}

const parseCardUrlsFromDetailList = (url:string, $:Root):Array<string> => {
  const cardList = $('div#card-list')
  if (cardList.length !== 1) {
    throw new InvalidArgumentError(`Failed to find 1 result for div#card-list on url: ${url}, found: ${cardList.length}`)
  }
  const cardListItems = cardList.find('div.card-list-item')
  const cardUrls:Array<string> = []
  cardListItems.each(function (this:cheerio.Cheerio, index, elem) {
    const item:cheerio.Cheerio = $(this); // eslint-disable-line no-invalid-this
    const cardNameAnchor = item.find('div.card-list-item-card-name').find('a')
    if (cardNameAnchor.length !== 1) {
      throw new InvalidArgumentError(`Failed to find 1 result for div.card-list-item-card-name.find(a) on url: ${url}, found: ${cardNameAnchor.length}`)
    }
    const relativeUrl = cardNameAnchor.attr().href;
    if (!relativeUrl || relativeUrl.trim() === '') {
      throw new InvalidArgumentError(`Failed to find relativeUrl on url: ${url}`)
    }
    cardUrls.push(`https://www.tcgcollector.com${relativeUrl.trim()}`)
  })
  return cardUrls;
}


const parseCardUrlsFromImageList = (url:string, $:Root):Array<string> => {
  const cardList = $('div#card-search-result')
  if (cardList.length !== 1) {
    throw new InvalidArgumentError(`Failed to find 1 result for div#card-search-result on url: ${url}, found: ${cardList.length}`)
  }
  const cardListItems = cardList.find('div.card-image-grid-item')
  const cardUrls:Array<string> = []
  cardListItems.each(function (this:cheerio.Cheerio, index, elem) {
    const item:cheerio.Cheerio = $(this); // eslint-disable-line no-invalid-this
    const cardAnchor = item.find('a.card-image-grid-item-link')
    if (cardAnchor.length !== 1) {
      throw new InvalidArgumentError(`Failed to find 1 result for div.card-image-grid-item-link.find(a) on url: ${url}, found: ${cardAnchor.length}`)
    }
    const relativeUrl = cardAnchor.attr().href;
    if (!relativeUrl || relativeUrl.trim() === '') {
      throw new InvalidArgumentError(`Failed to find relativeUrl on url: ${url}`)
    }
    cardUrls.push(`https://www.tcgcollector.com${relativeUrl.trim()}`)
  })
  return cardUrls;
}

const parseCardUrls = (url:string, $:Root):Array<string> => {
  const isImageList = $('div#card-search-result').length > 0
  const isDetailList = $('div#card-list').length > 0

  if (isImageList) {
    return parseCardUrlsFromImageList(url, $)
  } else if (isDetailList) {
    return parseCardUrlsFromDetailList(url, $)
  }

  throw new UnexpectedError(`Failed to detect card list type at url: ${url}`)
}

const parse = (url:string, html:string):CardsPageParseResult => {

  const $ = cheerio.load(html);

  return {
    cardUrls: parseCardUrls(url, $),
  }
}


export const tcgCollectorCardsPageParser = {
  parse,
}
