import {baseExternalClient, Method} from "./BaseExternalClient";
import {ExternalClientError} from "../error/ExternalClientError";
import {headlessBrowser} from "../infrastructure/HeadlessBrowser";
import {webScraper} from "../domain/scraping/WebScraper";
import {logger} from "firebase-functions";
import {ebayErrorRequestRecorder} from "../domain/ebay/error-requests/EbayErrorRequestRecorder";


export type SoldListingResult = {
  htmlPage:string,
  fullUrl:string,
  isMissing:boolean,
  err:any,
}

const getListingsForUrlUsingProxies = async (url:string):Promise<SoldListingResult> => {
  try {
    const response = await webScraper.fetchUrl(url)

    if (response.status === 404) {
      return {
        isMissing: true,
        fullUrl: url,
        htmlPage: '',
        err: null,
      }
    }

    return {
      htmlPage: response.data,
      fullUrl: url,
      isMissing: false,
      err: null,
    };
  } catch (err:any) {
    if (err instanceof ExternalClientError && err.responseStatus === 404) {
      return {
        isMissing: true,
        fullUrl: url,
        htmlPage: '',
        err: err,
      }
    }
    if (err.responseStatus === 400 && err.responseBody && typeof err.responseBody === "string") {
      const responseBody = err.responseBody
      if (responseBody && typeof responseBody === "string" && responseBody.length > 0  && responseBody.includes("<body") && responseBody.includes("</body>")) {
        return {
          htmlPage: responseBody,
          fullUrl: url,
          isMissing: false,
          err: null,
        };
      }
    }
    throw err
  }
}

const getListingsForUrlUsingBrowser = async (url:string):Promise<SoldListingResult> => {
  try {
    const response = await headlessBrowser.loadUrl(url)

    if (response.status === 404) {
      return {
        isMissing: true,
        fullUrl: url,
        htmlPage: '',
        err: null,
      }
    }

    return {
      htmlPage: response.content,
      fullUrl: url,
      isMissing: false,
      err: null,
    };
  } catch (err:any) {
    if (err instanceof ExternalClientError && err.responseStatus === 404) {
      return {
        isMissing: true,
        fullUrl: url,
        htmlPage: '',
        err: err,
      }
    }
    if (err.responseStatus === 400 && err.responseBody && typeof err.responseBody === "string") {
      const responseBody = err.responseBody
      if (responseBody && typeof responseBody === "string" && responseBody.length > 0  && responseBody.includes("<body") && responseBody.includes("</body>")) {
        return {
          htmlPage: responseBody,
          fullUrl: url,
          isMissing: false,
          err: null,
        };
      }
    }
    throw err
  }
}

const getListingsForUrl = async (url:string):Promise<SoldListingResult> => {
  try {
    const response:any = await baseExternalClient.request(url, Method.GET, null, null, null);
    const body = response.data
    // const response:string = await baseExternalClient.get<string>(url, null, null);
    return {
      htmlPage: body,
      fullUrl: url,
      isMissing: false,
      err: null,
    };
  } catch (err:any) {

    // if (
    //   err instanceof ExternalClientError
    //   && Math.floor(Math.random() * 100) === 50
    // ) {
    //   logger.info(`Recording error for url: ${url}`)
    //   await ebayErrorRequestRecorder.record(err)
    // }

    if (err instanceof ExternalClientError) {

      const scrapeResult = await webScraper.fetchUrl(url)
      if (scrapeResult.status === 200) {
        logger.info(`Web Scraper succeeded in getting data for url: ${url}`)
        return {
          htmlPage: scrapeResult.data,
          fullUrl: url,
          isMissing: false,
          err: null,
        };
      } else {
        logger.info(`Web Scraper failed in getting data for url: ${url} - ${scrapeResult.status}, - ${scrapeResult.error?.message}`)
      }

    }

    if (err instanceof ExternalClientError && err.responseStatus === 404) {
      return {
        isMissing: true,
        fullUrl: url,
        htmlPage: '',
        err: err,
      }
    }

    if (err.responseStatus === 400 && err.responseBody && typeof err.responseBody === "string") {
      const responseBody = err.responseBody
      if (responseBody && typeof responseBody === "string" && responseBody.length > 0  && responseBody.includes("<body") && responseBody.includes("</body>")) {
        return {
          htmlPage: responseBody,
          fullUrl: url,
          isMissing: false,
          err: null,
        };
      }
    }
    throw err
  }

}

export const ebaySoldListingsHtmlClient = {
  getListingsForUrl,
  getListingsForUrlUsingBrowser,
  getListingsForUrlUsingProxies,
}