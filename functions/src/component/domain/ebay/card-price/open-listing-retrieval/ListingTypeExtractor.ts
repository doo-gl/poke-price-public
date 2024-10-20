import {ListingType} from "../../open-listing/EbayOpenListingEntity";
import {ParsingError} from "../../../../error/ParsingError";
import Root = cheerio.Root;
import {dedupe} from "../../../../tools/ArrayDeduper";
import {logger} from "firebase-functions";



const extract = (url:string, $:Root):Array<ListingType> => {
  const buyItNow1 = $('#binBtn_btn') ;
  const buyItNow2 = $('#binBtn_btn_1') ;
  const buyItNow3 = $('.x-buybox-cta').find('.x-bin-action') ;
  const addToCart = $('#vi-viewInCartBtn') ;
  const addToCart2 = $('.x-buybox-cta').find('.x-atc-action') ;
  const bid = $('#bidBtn_btn');
  const bid2 = $('.x-buybox-cta').find('.x-bid-action');
  const bestOffer = $('#boBtn_btn');
  const addToBasket = $('#atcRedesignId_btn')

  const listingTypes:Array<ListingType> = [];

  if (buyItNow1.length > 0 || buyItNow2.length > 0 || buyItNow3.length > 0) {
    listingTypes.push(ListingType.BUY_IT_NOW);
  }
  if (addToBasket.length > 0) {
    listingTypes.push(ListingType.BUY_IT_NOW);
  }
  if (addToCart.length > 0 || addToCart2.length > 0) {
    listingTypes.push(ListingType.BUY_IT_NOW);
  }
  if (bid.length > 0 || bid2.length > 0) {
    listingTypes.push(ListingType.BID);
  }
  if (bestOffer.length > 0) {
    listingTypes.push(ListingType.BEST_OFFER);
  }
  if (listingTypes.length === 0) {
    logger.error(`Unrecognised listing type, url: ${url}`)
  }
  return dedupe(listingTypes, i => i);
}

export const listingTypeExtractor = {
  extract,
}