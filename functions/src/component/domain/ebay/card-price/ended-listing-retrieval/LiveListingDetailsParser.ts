import {PartialEbayListingDetails} from "./EbayEndedListingDetailsRetriever";
import {ParsingError} from "../../../../error/ParsingError";
import {listingNameExtractor} from "./ListingNameExtractor";
import {itemIdExtractor} from "./ItemIdExtractor";
import {salesUrlExtractor} from "./SalesUrlExtractor";
import {salesHistoryDetailsParser} from "./SalesHistoryDetailsParser";
import Root = cheerio.Root;


const parse = async (url:string, $:Root):Promise<PartialEbayListingDetails> => {
  const salesHistoryUrl = salesUrlExtractor.extract(url, $);

  if (!salesHistoryUrl) {
    throw new ParsingError(`No sales history url at url: ${url}`);
  }

  const listingName = listingNameExtractor.extract(url, $);
  const itemId = itemIdExtractor.extract(url);
  const originalListingUrl = url;

  const listings = await salesHistoryDetailsParser.parse(salesHistoryUrl)
  return {
    listingName,
    itemId,
    originalListingUrl,
    salesHistoryUrl,
    imageUrl: '',
    soldCount: null,
    listings,
  }
}

export const liveListingDetailsParser = {
  parse,
}