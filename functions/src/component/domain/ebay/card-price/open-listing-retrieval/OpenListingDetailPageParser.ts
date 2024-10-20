import {CurrencyAmountLike} from "../../../money/CurrencyAmount";
import cheerio from "cheerio";
import {ebaySoldListingsHtmlClient} from "../../../../client/EbaySoldListingsHtmlClient";
import {Moment} from "moment-timezone";
import {ListingType} from "../../open-listing/EbayOpenListingEntity";
import {timestampExtractor} from "../ended-listing-retrieval/TimestampExtractor";
import {sellersNotesExtractor} from "./SellersNotesExtractor";
import {itemSpecificsExtractor} from "./ItemSpecificsExtractor";
import {itemDescriptionExtractor} from "./ItemDescriptionExtractor";
import {imageUrlExtractor} from "./ImageUrlExtractor";
import {listingTypeExtractor} from "./ListingTypeExtractor";
import {priceExtractorV2} from "../ended-listing-retrieval/PriceExtractorV2";
import {bidCountExtractor} from "../ended-listing-retrieval/BidCountExtractor";
import {openListingPageChecker, ResultType} from "./OpenListingPageChecker";
import {ParsingError} from "../../../../error/ParsingError";


export interface OpenListingDetails {
  imageUrls:Array<string>,
  price:CurrencyAmountLike,
  buyItNowPrice:CurrencyAmountLike|null,
  bidCount:number|null,
  endTime:Moment|null,
  listingTypes:Array<ListingType>,
  sellersNotes:string|null,
  listingSpecifics:{[key:string]:string},
  description:string|null,
}


const parseUsingCheck = async (url:string):Promise<OpenListingDetails> => {
  const response = await openListingPageChecker.check(url)
  if (response.resultType !== ResultType.LIVE) {
    throw new ParsingError(`Listing: ${url} is being sourced but is not live`)
  }
  if (!response.price || !response.listingTypes || !response.imageUrls) {
    throw new ParsingError(`Listing: ${url} is being sourced but missing price / types / images`)
  }
  return {
    price: response.price,
    bidCount: response.bidCount,
    endTime: response.endedTimestamp,
    buyItNowPrice: response.buyItNowPrice,
    listingTypes: response.listingTypes,
    imageUrls: response.imageUrls,
    sellersNotes: response.sellersNotes,
    description: response.description,
    listingSpecifics: response.listingSpecifics,
  }
}

const parseV1 = async (url:string):Promise<OpenListingDetails> => {
  const response = await ebaySoldListingsHtmlClient.getListingsForUrl(url);
  const $ = cheerio.load(response.htmlPage);
  const priceDetails = priceExtractorV2.extract(url, $);
  // const price = priceExtractor.extract(url, $);
  const imageUrls = imageUrlExtractor.extract(url, $);
  const bidCount = bidCountExtractor.extract(url, $);
  const endTime = timestampExtractor.extractFromLive(url, $);
  const listingTypes = listingTypeExtractor.extract(url, $);
  const sellersNotes = sellersNotesExtractor.extract(url, $);
  const itemSpecifics = itemSpecificsExtractor.extract(url, $);
  const itemDescription = itemDescriptionExtractor.extract(url, $);
  return {
    price: priceDetails.price,
    buyItNowPrice: priceDetails.buyItNowPrice,
    bidCount,
    imageUrls,
    endTime,
    listingTypes,
    sellersNotes,
    description: itemDescription,
    listingSpecifics: itemSpecifics,
  }
}

const parse = async (url:string):Promise<OpenListingDetails> => {
  return parseUsingCheck(url)
}

export const openListingDetailPageParser = {
  parse,
}