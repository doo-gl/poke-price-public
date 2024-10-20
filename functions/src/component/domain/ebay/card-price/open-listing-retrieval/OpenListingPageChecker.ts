import {CurrencyAmountLike} from "../../../money/CurrencyAmount";
import {ebaySoldListingsHtmlClient, SoldListingResult} from "../../../../client/EbaySoldListingsHtmlClient";
import cheerio from "cheerio";
import {ParsingError} from "../../../../error/ParsingError";
import {bidCountExtractor} from "../ended-listing-retrieval/BidCountExtractor";
import {textExtractor} from "../ended-listing-retrieval/TextExtractor";
import {Moment} from "moment";
import {timestampExtractor} from "../ended-listing-retrieval/TimestampExtractor";
import {listingNameExtractor} from "../ended-listing-retrieval/ListingNameExtractor";
import {sellersNotesExtractor} from "./SellersNotesExtractor";
import {itemSpecificsExtractor} from "./ItemSpecificsExtractor";
import {itemDescriptionExtractor} from "./ItemDescriptionExtractor";
import {bestOfferExtractor} from "../ended-listing-retrieval/BestOfferExtractor";
import {missingListingIdentifier} from "./MissingListingIdentifier";
import {itemIdExtractor} from "../ended-listing-retrieval/ItemIdExtractor";
import {listingTypeExtractor} from "./ListingTypeExtractor";
import {imageUrlExtractor} from "./ImageUrlExtractor";
import {ListingType} from "../../open-listing/EbayOpenListingEntity";
import {priceExtractorV2} from "../ended-listing-retrieval/PriceExtractorV2";
import Root = cheerio.Root;
import {endListingMessageExtractor} from "../ended-listing-retrieval/EndListingMessageExtractor";

export enum ResultType {
  LIVE = 'LIVE',
  ENDED_WITH_SALE = 'ENDED_WITH_SALE',
  ENDED_WITHOUT_SALE = 'ENDED_WITHOUT_SALE',
  LISTING_IS_MISSING = 'LISTING_IS_MISSING',
  UNKNOWN = 'UNKNOWN',
}

export interface EbayOpenListingCheckResult {
  resultType:ResultType,
  url:string,
  listingId:string,
  listingName:string|null,
  listingMessage:string|null,
  price:CurrencyAmountLike|null,
  buyItNowPrice:CurrencyAmountLike|null,
  endedTimestamp:Moment|null,
  listingTypes:Array<ListingType>|null,
  imageUrls:Array<string>|null,
  bidCount:number|null,
  sellersNotes:string|null,
  listingSpecifics:{[key:string]:string},
  description:string|null,
  isBestOffer:boolean|null
}



const calculateResultType = (url:string, message:string, bidCount:number|null):ResultType => {
  const LISTING_ENDED_REGEX = new RegExp(/(This listing has ended.|This Buy it now listing has ended.|This listing was ended by the seller because the item was sold.|This listing ended on )/gim);
  const BIDDING_ENDED_REGEX = new RegExp(/(Bidding has ended on this item.|Bidding ended on )/gim);
  const ENDED_WITHOUT_SALE_REGEX = new RegExp(/(The seller has relisted this item or one like this.|This listing was ended by the seller because the item is no longer available.|This listing was ended by the seller because there was an error in the listing.|Bidding has ended on this item. The seller has relisted this item or one like this.|This item is out of stock|This listing was ended by the seller because the item was lost or broken.)/gim)

  const listingEndedMatch = LISTING_ENDED_REGEX.exec(message);
  const biddingEndedMatch = BIDDING_ENDED_REGEX.exec(message);
  const endedWithoutSaleMatch = ENDED_WITHOUT_SALE_REGEX.exec(message);

  if (endedWithoutSaleMatch && endedWithoutSaleMatch.length > 0) {
    return ResultType.ENDED_WITHOUT_SALE;
  }
  if (listingEndedMatch && listingEndedMatch.length > 0) {
    return ResultType.ENDED_WITH_SALE;
  }
  if (biddingEndedMatch && biddingEndedMatch.length > 0 && bidCount && bidCount > 0) {
    return ResultType.ENDED_WITH_SALE;
  }
  if (biddingEndedMatch && biddingEndedMatch.length > 0 && !Number.isSafeInteger(bidCount)) {
    throw new ParsingError(`Bidding ended but no bid count found at url: ${url}`)
  }
  if (biddingEndedMatch && biddingEndedMatch.length > 0 && bidCount === 0) {
    return ResultType.ENDED_WITHOUT_SALE;
  }
  return ResultType.UNKNOWN;
}

const isLiveListing = (url:string, $:Root):boolean => {
  const status = endListingMessageExtractor.extractOptionalEndListingMessage(url, $)
  if (status && new RegExp(/(This item is out of stock.)/gim).exec(status)) {
    return false;
  }

  const buyItNow = $('#binBtn_btn') ;
  const buyItNow2 = $('.x-buybox-cta').find('.x-bin-action') ;
  const bid = $('#bidBtn_btn');
  const bid2 = $('.x-buybox-cta').find('.x-bid-action');
  const bestOffer = $('#boBtn_btn');
  // const quantityBox = $('#qtyTextBox');
  const addToCartButton = $('#atcRedesignId_btn')
  const addToCartButton2 = $('.x-buybox-cta').find('.x-atc-action');
  return buyItNow.length > 0 || buyItNow2.length > 0
    || bid.length > 0 || bid2.length > 0
    || bestOffer.length > 0
    || addToCartButton.length > 0 || addToCartButton2.length > 0
}

const check = async (url:string):Promise<EbayOpenListingCheckResult> => {
  const soldListingResult:SoldListingResult = await ebaySoldListingsHtmlClient.getListingsForUrl(url);
  const listingId = itemIdExtractor.extract(url)
  if (soldListingResult.isMissing) {
    return {
      resultType: ResultType.LISTING_IS_MISSING,
      url,
      listingId,
      listingName: null,
      price: null,
      buyItNowPrice: null,
      endedTimestamp: null,
      imageUrls: null,
      listingTypes: null,
      bidCount: null,
      listingMessage: null,
      sellersNotes: null,
      description: null,
      isBestOffer: null,
      listingSpecifics: {},
    }
  }

  const $ = cheerio.load(soldListingResult.htmlPage);

  if (missingListingIdentifier.isMissing(url, $)) {
    return {
      resultType: ResultType.LISTING_IS_MISSING,
      url,
      listingId,
      listingName: null,
      price: null,
      buyItNowPrice: null,
      endedTimestamp: null,
      imageUrls: null,
      listingTypes: null,
      bidCount: null,
      listingMessage: null,
      sellersNotes: null,
      description: null,
      isBestOffer: null,
      listingSpecifics: {},
    }
  }

  const priceInfo = priceExtractorV2.extract(url, $);
  // const price = priceExtractor.extract(url, $);
  const bidCount = bidCountExtractor.extract(url, $);
  const listingName = listingNameExtractor.extract(url, $);
  const sellersNotes = sellersNotesExtractor.extract(url, $);
  const itemSpecifics = itemSpecificsExtractor.extract(url, $);
  const itemDescription = itemDescriptionExtractor.extract(url, $);
  const isBestOffer = bestOfferExtractor.isBestOfferAccepted(url, $)
  if (isLiveListing(url, $)) {
    const timestamp = timestampExtractor.extractFromLive(url, $);
    const listingTypes = listingTypeExtractor.extract(url, $);
    const imageUrls = imageUrlExtractor.extract(url, $)

    return {
      listingName,
      url,
      listingId,
      resultType: ResultType.LIVE,
      price: priceInfo.price,
      buyItNowPrice: priceInfo.buyItNowPrice,
      endedTimestamp: timestamp,
      listingTypes: listingTypes,
      imageUrls: imageUrls,
      bidCount,
      listingMessage: null,
      isBestOffer: null,
      sellersNotes,
      description: itemDescription,
      listingSpecifics: itemSpecifics,
    };
  }

  const listingEndedMessage = endListingMessageExtractor.extractEndListingMessage(url, $);
  const resultType = calculateResultType(url, listingEndedMessage, bidCount);
  const endedTimestamp = timestampExtractor.maybeExtract(url, $);
  return {
    listingName,
    url,
    listingId,
    resultType,
    price: priceInfo.price,
    buyItNowPrice: priceInfo.buyItNowPrice,
    endedTimestamp,
    imageUrls: null,
    listingTypes: null,
    bidCount,
    listingMessage: listingEndedMessage,
    isBestOffer: isBestOffer,
    sellersNotes,
    description: itemDescription,
    listingSpecifics: itemSpecifics,
  };
}

export const openListingPageChecker = {
  check,
}