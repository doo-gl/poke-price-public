import Root = cheerio.Root;
import {priceExtractor} from "../ended-listing-retrieval/PriceExtractor";
import {ParsingError} from "../../../../error/ParsingError";


const isMissing = (url:string, $:Root):boolean => {
  try {
    const foundSimilarDiv = $('div.app-cvip-replacement-message')
    const soldOutMessage = $('div#mainContent').find('div.outofstock')

    if (foundSimilarDiv.length > 0 && foundSimilarDiv.text().trim() !== 'We found something similar') {
      return true
    }
    if (soldOutMessage.length > 0) {
      return true
    }
    priceExtractor.extract(url, $)
    return false
  } catch (err:any) {
    return err instanceof ParsingError;
  }
}

export const missingListingIdentifier = {
  isMissing,
}