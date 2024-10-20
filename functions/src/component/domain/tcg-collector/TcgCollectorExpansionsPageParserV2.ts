import cheerio from "cheerio";
import {flattenArray} from "../../tools/ArrayFlattener";
import {TcgCollectorRegion} from "./TcgCollectorWebScrapingClient";
import {ParsingError} from "../../error/ParsingError";
import Root = cheerio.Root;
import Cheerio = cheerio.Cheerio;
import {removeNulls} from "../../tools/ArrayNullRemover";
import { logger } from "firebase-functions";

export interface ExpansionParseResult {
  seriesName:string,
  setName:string,
  setLogoUrl:string,
  setSymbolUrl:string|null,
  setCode:string|null,
  tcgCollectorSetUrl:string,
  tcgPlayerSetUrl:string|null,
  releaseDate:string,
  region:TcgCollectorRegion,
}

export interface ExpansionsPageParseResult {
  expansions:Array<ExpansionParseResult>
}

const parseRegion = (tcgCollectorSetUrl:string):TcgCollectorRegion => {
  const intlRegex = new RegExp('/intl/', 'gim')
  const jpRegex = new RegExp('/jp/', 'gim')

  const intlMatch = intlRegex.exec(tcgCollectorSetUrl)
  const jpMatch = jpRegex.exec(tcgCollectorSetUrl)
  if (intlMatch && jpMatch) {
    throw new ParsingError(`Matched both intl and jp in url: ${tcgCollectorSetUrl}`)
  }
  if (!intlMatch && !jpMatch) {
    throw new ParsingError(`Matched neither intl and jp in url: ${tcgCollectorSetUrl}`)
  }
  if (intlMatch) {
    return "intl"
  }
  return "jp"
}

const parseSeriesName = (rawSeriesName:string):string => {
  return rawSeriesName
    .replace(/era/gim, '')
    .trim()
}

const parseSetBlock = (url:string, block:{setBlock:Cheerio, seriesName:string}):ExpansionParseResult|null => {

  const setBlock = block.setBlock

  const seriesName:string = parseSeriesName(block.seriesName.trim())
  const setName:string = setBlock.find('.expansion-logo-grid-item-expansion-name').text().trim()
  const setLogoUrl:string|null = setBlock.find('img.expansion-logo-grid-item-expansion-logo').attr('src') ?? null
  const setSymbolUrl:string|null = setBlock.find('img.expansion-logo-grid-item-expansion-symbol').attr('src') ?? null
  const setCode:string = setBlock.find('.expansion-logo-grid-item-expansion-code').text().trim()
  const releaseDate:string = setBlock.find('.expansion-logo-grid-item-release-date').text().trim()
  const tcgCollectorSetRelativeUrl:string|null = setBlock.find('a.expansion-logo-grid-item-expansion-name').attr('href') ?? null
  const tcgPlayerSetUrl:string|null = setBlock.find('.expansion-logo-grid-item-price a').attr('href') ?? null

  if (!setLogoUrl) {
    logger.info(`No logo url for set: ${setName} on url: ${url}, skipping`)
    return null
  }
  if (!tcgCollectorSetRelativeUrl) {
    logger.info(`No relative url for set: ${setName} on url: ${url}, skipping`)
    return null
  }

  const tcgCollectorSetUrl:string|null = `https://www.tcgcollector.com${tcgCollectorSetRelativeUrl}`
  const region = parseRegion(tcgCollectorSetUrl)

  return {
    seriesName,
    setName,
    setLogoUrl,
    setSymbolUrl,
    setCode,
    tcgCollectorSetUrl,
    tcgPlayerSetUrl,
    releaseDate,
    region,
  }
}

const parseSeriesBlock = (url:string, $:Root, block:{seriesBlock:Cheerio, seriesName:string}):Array<{setBlock:Cheerio, seriesName:string}> => {
  const setBlocks = new Array<{setBlock:Cheerio, seriesName:string}>()
  const seriesBlock = block.seriesBlock
  const seriesName = block.seriesName

  seriesBlock.find('.expansion-logo-grid-item').each(function (this:Cheerio, index, elem) {
    const row:Cheerio = $(this); // eslint-disable-line no-invalid-this
    setBlocks.push({setBlock: row, seriesName})
  })

  return setBlocks
}

const pickSeriesBlocksFromPage = (url:string, $:Root):Array<{seriesBlock:Cheerio, seriesName:string}> => {
  const seriesBlocks = new Array<{seriesBlock:Cheerio, seriesName:string}>()
  $('#expansion-search-result div.expansion-logo-grid').each(function (this:Cheerio, index, elem) {
    const row:Cheerio = $(this); // eslint-disable-line no-invalid-this
    const seriesTitle = row.find('.expansion-logo-grid-title')
    const seriesName = seriesTitle.text()
    const seriesBlock = row.find('.expansion-logo-grid-items')
    seriesBlocks.push({seriesBlock, seriesName})
  })
  return seriesBlocks
}

const parse = (url:string, html:string):ExpansionsPageParseResult => {

  const $ = cheerio.load(html);

  const seriesBlocks = pickSeriesBlocksFromPage(url, $)
  const setBlocks = flattenArray(seriesBlocks.map(block => parseSeriesBlock(url, $, block)))
  const expansions = removeNulls(setBlocks.map(block => parseSetBlock(url, block)))
  return {
    expansions,
  }
}

export const tcgCollectorExpansionPageParser = {
  parse,
}