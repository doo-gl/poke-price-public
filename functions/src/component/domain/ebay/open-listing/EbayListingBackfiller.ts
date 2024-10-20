import {ebayListUrlReader} from "./EbayListUrlReader";
import {openListingResultParser} from "./OpenListingResultParser";
import cheerio from "cheerio";
import {logger} from "firebase-functions";
import {ebaySearchParamRetriever} from "../search-param/EbayCardSearchParamRetriever";
import {ebayOpenListingUrlCreator} from "../card-price/open-listing-retrieval/EbayOpenListingUrlCreator";
import {timestampToMoment} from "../../../tools/TimeConverter";
import moment from "moment";
import {ebaySearchParamUpdater} from "../search-param/EbayCardSearchParamUpdater";
import {webScraper} from "../../scraping/WebScraper";
import {FieldValue} from "../../../external-lib/Firebase";
import {itemRetriever} from "../../item/ItemRetriever";

const backfillForUrl = async (cardId:string, url:string, options?:{force?:boolean, local?:boolean}) => {
  const response = await webScraper.fetchUrl(url, {local: options?.local})
  if (response.status && response.status >= 400) {
    throw new Error(`Failed to load sold url, status: ${response.status}`)
  }

  const $ = cheerio.load(response.data);
  if ($('#captcha_form').length > 0) {
    throw new Error(`Served captcha on url: ${url}`)
  }
  const results = await ebayListUrlReader.readListHtmlPage(response.data)
  await openListingResultParser.parse(cardId, results)
}

const backfill = async (cardId:string, options?:{force?:boolean, local?:boolean}):Promise<void> => {
  logger.info(`Backfilling card: ${cardId}`)
  const item = await itemRetriever.retrieveByIdOrLegacyId(cardId)
  const searchParams = await ebaySearchParamRetriever.retrieveSearchParamsForItemId(item._id.toString())
  if (searchParams.length === 0) {
    return
  }
  const searchParam = searchParams[0]
  const isAlreadyBackfilled = searchParam.backfillTime
    && timestampToMoment(searchParam.backfillTime).isAfter(moment())
  if (isAlreadyBackfilled && !options?.force) {
    logger.info(`Card: ${cardId}, already backfilled`)
    return
  }
  const ukUrl = ebayOpenListingUrlCreator.createSoldUK(searchParam, { random: true })
  const usUrl = ebayOpenListingUrlCreator.createSoldUS(searchParam, { random: true })

  await Promise.all([
    backfillForUrl(cardId, ukUrl, options),
    backfillForUrl(cardId, usUrl, options),
  ])

  // @ts-ignore
  await ebaySearchParamUpdater.update(searchParam.id, { backfillTime: FieldValue.delete() })
  logger.info(`Backfilled card: ${cardId}`)
}

export const ebayListingBackfiller = {
  backfill,
}