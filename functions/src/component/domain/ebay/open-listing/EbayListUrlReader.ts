import {ConcurrentPromiseQueue} from "concurrent-promise-queue";
import {
  EbayOpenListingCheckResult,
  openListingPageChecker,
} from "../card-price/open-listing-retrieval/OpenListingPageChecker";
import {handleAll, HandledPromises} from "../../../tools/AllPromiseHandler";
import {removeNulls} from "../../../tools/ArrayNullRemover";
import {ParsingError} from "../../../error/ParsingError";
import {queryString} from "../../../external-lib/QueryString";
import {ebaySoldListingsHtmlClient} from "../../../client/EbaySoldListingsHtmlClient";
import cheerio from "cheerio";
import {logger} from "firebase-functions";
import Root = cheerio.Root;
import Cheerio = cheerio.Cheerio;






const extractEbayListingUrl = ($:Root, row:Cheerio):string => {
  const linkTag = row.find('a.s-item__link');
  const href = linkTag.attr('href');
  if (!href) {
    throw new ParsingError(`No href on item link`)
  }
  const parsedUrl = queryString.parseUrl(href);
  return parsedUrl.url
}

const readListingUrlsFromListHtml = async (html:string):Promise<Array<string>> => {
  const $ = cheerio.load(html);
  const listingUrls:Array<string> = []
  $('#srp-river-results li.s-item').each(function (this:Cheerio, index, elem) {
    // see https://github.com/typescript-eslint/typescript-eslint/issues/604
    const row:Cheerio = $(this); // eslint-disable-line no-invalid-this
    try {
      listingUrls.push(extractEbayListingUrl($, row))
    } catch (err:any) {
      logger.error(`Failed to read listing link: ${err.message}`)
    }
  })
  return listingUrls
}

const readListingUrls = async (listingUrls:Array<string>):Promise<HandledPromises<EbayOpenListingCheckResult>> => {
  const queue = new ConcurrentPromiseQueue<EbayOpenListingCheckResult>({ maxNumberOfConcurrentPromises: 10 })
  const listingUrlResults = await handleAll(
    listingUrls.map(listingUrl => queue.addPromise(() => openListingPageChecker.check(listingUrl)))
  )
  return {
    results: removeNulls(listingUrlResults.results),
    errors: listingUrlResults.errors,
  }
}

const readListHtmlPage = async (listHtml:string):Promise<Array<EbayOpenListingCheckResult>> => {
  const listingUrlsToCheck = await readListingUrlsFromListHtml(listHtml)
  const listingDetails = await readListingUrls(listingUrlsToCheck)
  listingDetails.errors.forEach(err => {
    logger.error(`Failed while reading listing`, err)
  })
  return listingDetails.results
}

const read = async (listUrl:string):Promise<Array<EbayOpenListingCheckResult>> => {
  const pageFetchResult = await ebaySoldListingsHtmlClient.getListingsForUrl(listUrl);
  if (pageFetchResult.isMissing || !pageFetchResult.htmlPage || pageFetchResult.htmlPage.length === 0) {
    return []
  }
  const html = pageFetchResult.htmlPage
  return readListHtmlPage(html)
}

export const ebayListUrlReader = {
  read,
  readListHtmlPage,
}