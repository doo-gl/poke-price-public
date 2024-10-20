import cheerio from "cheerio";
import Root = cheerio.Root;
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {textExtractor} from "../ebay/card-price/ended-listing-retrieval/TextExtractor";
import {logger} from "firebase-functions";

export enum TcgCollectorCardType {
  NORMAL = 'NORMAL',
  REVERSE_HOLO = 'REVERSE_HOLO',
  POKE_BALL_HOLO = 'POKE_BALL_HOLO',
  MASTER_BALL_HOLO = 'MASTER_BALL_HOLO',
  PROMO = 'PROMO',
  HOLO = 'HOLO',
  NORMAL_HOLO = 'NORMAL_HOLO',
  JUMBO_SIZE = 'JUMBO_SIZE',
  NORMAL_HOLO_JUMBO_SIZE = 'NORMAL_HOLO_JUMBO_SIZE',
  FIRST_EDITION = 'FIRST_EDITION',
}

export interface CardPageParseResult {
  name:string,
  imageUrl:string,
  rarity:string,
  artist:string,
  cardCode:string,
  types:Array<string>,
  evolutionStatus:Array<string>,
  energyTypes:Array<string>,
  tcgCollectorCardId:string,
  tcgCollectorCardUrl:string,
  cardTypes:Array<TcgCollectorCardType>,
}

const parseName = (url:string, $:Root):string => {
  const cardInfoTitleContainer = $('div#card-info-title-container')
  if (cardInfoTitleContainer.length !== 1) {
    throw new InvalidArgumentError(`Failed to find 1 result for div#card-info-title-container on url: ${url}, found: ${cardInfoTitleContainer.length}`)
  }
  const titleTag = cardInfoTitleContainer.find('h1')
  if (titleTag.length !== 1) {
    throw new InvalidArgumentError(`Failed to find 1 result for div#card-info-title-container.find(h1) on url: ${url}, found: ${titleTag.length}`)
  }
  const title = titleTag.text();
  if (!title || title.trim() === '') {
    throw new InvalidArgumentError(`Failed to find title on url: ${url}`)
  }
  return title.trim()
}

const parseImageUrl = (url:string, $:Root):string => {
  const cardImageAndControlsContainer = $('div#card-image-container')
  if (cardImageAndControlsContainer.length !== 1) {
    throw new InvalidArgumentError(`Failed to find 1 result for div#card-image-container on url: ${url}, found: ${cardImageAndControlsContainer.length}`)
  }
  const imgTag = cardImageAndControlsContainer.children('img')
  if (imgTag.length !== 1) {
    throw new InvalidArgumentError(`Failed to find 1 result for div#card-image-container.children(img) on url: ${url}, found: ${imgTag.length}`)
  }
  const imageUrl = imgTag.attr().src;
  if (!imageUrl || imageUrl.trim() === '') {
    throw new InvalidArgumentError(`Failed to find imageUrl on url: ${url}`)
  }
  return imageUrl.trim()
}

const findFooterItem = (url:string, $:Root, footerItems:cheerio.Cheerio, footerName:string):cheerio.Cheerio => {
  let filterItem = null
  footerItems.each(function (this:cheerio.Cheerio, index, elem) {
    const item:cheerio.Cheerio = $(this); // eslint-disable-line no-invalid-this
    const name = item.find('div.card-info-footer-item-title').text().trim()
    if (name === footerName) {
      filterItem = item
    }
  });
  if (filterItem) {
    return filterItem
  }
  throw new InvalidArgumentError(`Failed to find footer item ${footerName} at url: ${url}`)
}

const parseArtist = (url:string, $:Root):string => {
  const cardInfoFooter = $('div#card-info-footer')
  if (cardInfoFooter.length !== 1) {
    throw new InvalidArgumentError(`Failed to find 1 result for div#card-info-footer on url: ${url}, found: ${cardInfoFooter.length}`)
  }
  const footerItems = cardInfoFooter.find('div.card-info-footer-item')
  const artistItem = findFooterItem(url, $, footerItems, 'Illustrators')
  const cardInfoFooterItemText = artistItem.find('div.card-info-footer-item-text')
  if (cardInfoFooterItemText.length !== 1) {
    throw new InvalidArgumentError(`Failed to find 1 result for span.card-info-footer-item-text on url: ${url}, found: ${cardInfoFooterItemText.length}`)
  }
  const artist = textExtractor.extractFromCheerio(cardInfoFooterItemText)
  if (!artist || artist.trim() === '') {
    throw new InvalidArgumentError(`Failed to find artist on url: ${url}`)
  }
  return artist.trim()
}

const parseCardCode = (url:string, $:Root):string => {
  const cardInfoFooter = $('div#card-info-footer')
  if (cardInfoFooter.length !== 1) {
    throw new InvalidArgumentError(`Failed to find 1 result for div#card-info-footer on url: ${url}, found: ${cardInfoFooter.length}`)
  }
  const footerItems = cardInfoFooter.find('div.card-info-footer-item')
  const cardNumberItem = findFooterItem(url, $, footerItems, 'Card number')
  const cardInfoFooterItemText = cardNumberItem.find('div.card-info-footer-item-text')
  if (cardInfoFooterItemText.length !== 1) {
    throw new InvalidArgumentError(`Failed to find 1 result for span.card-info-footer-item-text on url: ${url}, found: ${cardInfoFooterItemText.length}`)
  }
  const cardCode = textExtractor.extractFromCheerio(cardInfoFooterItemText)
  if (!cardCode || cardCode.trim() === '') {
    throw new InvalidArgumentError(`Failed to find cardCode on url: ${url}`)
  }
  return cardCode.trim()
}

const parseRarity = (url:string, $:Root):string => {
  const cardInfoFooter = $('div#card-info-footer')
  if (cardInfoFooter.length !== 1) {
    throw new InvalidArgumentError(`Failed to find 1 result for div#card-info-footer on url: ${url}, found: ${cardInfoFooter.length}`)
  }
  const footerItems = cardInfoFooter.find('div.card-info-footer-item')
  const rarityItem = findFooterItem(url, $, footerItems, 'Rarity')
  const cardInfoFooterItemText = rarityItem.find('div.card-info-footer-item-text')
  if (cardInfoFooterItemText.length !== 1) {
    throw new InvalidArgumentError(`Failed to find 1 result for span.card-info-footer-item-text on url: ${url}, found: ${cardInfoFooterItemText.length}`)
  }
  const rarity = textExtractor.extractFromCheerio(cardInfoFooterItemText)
  if (!rarity || rarity.trim() === '') {
    throw new InvalidArgumentError(`Failed to find rarity on url: ${url}`)
  }
  return rarity.trim()
}

const parseType = (url:string, $:Root):Array<string> => {
  const cardTypeContainers = $('a#card-type-containers').find('.card-type-container')
  if (cardTypeContainers.length === 0) {
    throw new InvalidArgumentError(`Failed to find result for a#card-type-containers.find(#card-type-container) on url: ${url}, found: ${cardTypeContainers.length}`)
  }
  const types:Array<string> = []
  cardTypeContainers.each(function (this:cheerio.Cheerio, index, elem) {
    const item: cheerio.Cheerio = $(this); // eslint-disable-line no-invalid-this
    const type = textExtractor.extractFromCheerio(item)
    if (!type || type.trim() === '') {
      throw new InvalidArgumentError(`Failed to find type on url: ${url}`)
    }
    types.push(type)
  })
  return types;
}

const parseEvolutionStatus = (url:string, $:Root):Array<string> => {
  const cardEvolutionStatus = $('div#card-evolution-status')
  if (cardEvolutionStatus.length === 0) {
    return []
  }
  if (cardEvolutionStatus.length !== 1) {
    throw new InvalidArgumentError(`Failed to find 1 result for div#card-evolution-status on url: ${url}, found: ${cardEvolutionStatus.length}`)
  }
  const evolutionStatus = new Array<string>()
  cardEvolutionStatus.find('a').each(function (this:cheerio.Cheerio, index, elem) {
    const tag: cheerio.Cheerio = $(this); // eslint-disable-line no-invalid-this
    const text = textExtractor.extractFromCheerio(tag)
    evolutionStatus.push(text.replace(/[\s]+/gim, ' ').trim())
  })
  return evolutionStatus
}

const parseEnergyTypes = (url:string, $:Root):Array<string> => {
  const cardEnergyTypes = $('a#card-energy-types').find('img')
  if (cardEnergyTypes.length === 0) {
    return []
  }
  const energyTypes:Array<string> = []
  cardEnergyTypes.each(function (this:cheerio.Cheerio, index, elem) {
    const item: cheerio.Cheerio = $(this); // eslint-disable-line no-invalid-this
    const type = item.attr().alt
    if (!type || type.trim() === '') {
      throw new InvalidArgumentError(`Failed to find energyType on url: ${url}`)
    }
    energyTypes.push(type)
  })
  return energyTypes;
}

const parseCardId = (url:string) => {
  const regex = new RegExp('/cards/([^/]+)/[^/]+', 'gim')
  const match = regex.exec(url)
  if (!match) {
    throw new InvalidArgumentError(`Failed to find card id in url: ${url}`)
  }
  return match[1]
}

const parseCardTypes = (url:string, $:Root, cardId:string):Array<TcgCollectorCardType> => {

  const rawHtml = $.html()
  const match = new RegExp("^\\s*appState:\\s+({.*}),\\s*$", "gim").exec(rawHtml)
  if (!match) {
    throw new InvalidArgumentError(`Failed to find app state json at url: ${url}`)
  }
  const appState = JSON.parse(match[1])
  const cardIdToCardVariantTypeIdsMap = appState['cardIdToCardVariantTypeIdsMap']
  if (!cardIdToCardVariantTypeIdsMap) {
    throw new InvalidArgumentError(`Failed to read cardIdToCardVariantTypeIdsMap from app state in url: ${url}`)
  }
  const idToCardVariantTypeMap = appState['idToCardVariantTypeMap']
  if (!idToCardVariantTypeMap) {
    throw new InvalidArgumentError(`Failed to read idToCardVariantTypeMap from app state in url: ${url}`)
  }
  const variantTypeIds = cardIdToCardVariantTypeIdsMap[cardId]
  if (!variantTypeIds) {
    throw new InvalidArgumentError(`Failed to read variantTypeIds for cardId: ${cardId} from app state in url: ${url}`)
  }
  if (!Array.isArray(variantTypeIds)) {
    throw new InvalidArgumentError(`Not array - variantTypeIds for cardId: ${cardId} from app state in url: ${url}`)
  }

  const cardTypes = new Array<TcgCollectorCardType>()
  variantTypeIds.forEach(variantTypeId => {
    const variantType = idToCardVariantTypeMap[variantTypeId]
    if (!variantType) {
      throw new InvalidArgumentError(`Variant type not found for id: ${variantTypeId} for cardId: ${cardId} from app state in url: ${url}`)
    }
    if (
      variantType.name === "Normal"
      || variantType.name === "Normal Holo"
    ) {
      cardTypes.push(TcgCollectorCardType.NORMAL)
    } else if (variantType.name === "Reverse Holo") {
      cardTypes.push(TcgCollectorCardType.REVERSE_HOLO)
    } else if (variantType.name === "Poké Ball Holo") {
      cardTypes.push(TcgCollectorCardType.POKE_BALL_HOLO)
    } else if (variantType.name === "Master Ball Holo") {
      cardTypes.push(TcgCollectorCardType.MASTER_BALL_HOLO)
    } else if (variantType.name === "Promo") {
      cardTypes.push(TcgCollectorCardType.PROMO)
    } else if (variantType.name === "Holo") {
      cardTypes.push(TcgCollectorCardType.HOLO)
    } else if (variantType.name === "Normal Holo, Jumbo Size") {
      cardTypes.push(TcgCollectorCardType.JUMBO_SIZE)
    } else if (variantType.name === "Jumbo Size") {
      cardTypes.push(TcgCollectorCardType.NORMAL_HOLO_JUMBO_SIZE)
    } else if (variantType.name === "1st Edition") {
      cardTypes.push(TcgCollectorCardType.FIRST_EDITION)
    } else {
      logger.warn(`Unrecognised variant type: '${variantType.name}', at url: ${url}`)
    }
  })

  if (cardTypes.length === 0) {
    throw new InvalidArgumentError(`Failed to find any card types in app state at url: ${url}`)
  }

  return cardTypes
}

const parse = (url:string, html:string):CardPageParseResult => {

  const $ = cheerio.load(html);

  const tcgCollectorCardId = parseCardId(url)
  return {
    name: parseName(url, $),
    imageUrl: parseImageUrl(url, $),
    artist: parseArtist(url, $),
    cardCode: parseCardCode(url, $),
    rarity: parseRarity(url, $),
    types: parseType(url, $),
    evolutionStatus: parseEvolutionStatus(url, $),
    energyTypes: parseEnergyTypes(url, $),
    tcgCollectorCardId,
    tcgCollectorCardUrl: url,
    cardTypes: parseCardTypes(url, $, tcgCollectorCardId),
  }
}

export const tcgCollectorCardPageParser = {
  parse,
}