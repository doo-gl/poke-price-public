import {CurrencyAmountLike, fromCurrencyAmountLike} from "../money/CurrencyAmount";
import {BuyingOpportunityScorePart} from "../ebay/open-listing/EbayOpenListingEntity";
import {ebayOpenListingRetriever} from "../ebay/open-listing/EbayOpenListingRetriever";
import {removeNulls} from "../../tools/ArrayNullRemover";
import {jsonToCsv} from "../../external-lib/JsonToCsv";
import {logger} from "firebase-functions";


export interface TopBuyingOpportunityRow {
  cardId:string,
  listingId:string,
  listingName:string,
  listingUrl:string,
  listingRedirectUrl:string
  listingTypes:string,
  listingEndTime:string|null,
  listingCreatedTime:string,
  scoreParts:string
  soldVolume:number,
  soldPrice:string,
  soldMinPrice:string|null,
  soldLowPrice:string|null,
  currentListingPrice:string,
  canBuyNow:boolean,
  belowSoldPriceScore:number,
  belowMinSoldPriceScore:number,
  belowLowSoldPriceScore:number,
  listingEndsInFourHoursScore:number,
  listingEndsInEightHoursScore:number,
  listingEndsInSixteenHoursScore:number,
  profitScore:number,
  volumeScore:number,
  score:number,
}

const retrieveRows = async ():Promise<Array<TopBuyingOpportunityRow>> => {
  const topListings = await ebayOpenListingRetriever.retrieveTopByBuyingOpportunityScore(1000)
  logger.info(`Found ${topListings.length} top listings`)
  const results = await removeNulls<TopBuyingOpportunityRow>(topListings.map(listing => {
    // @ts-ignore
    if (!listing.buyingOpportunity || listing.buyingOpportunity.differenceToMedian) {
      return null
    }

    return {
      cardId: listing.cardId,
      listingId: listing.id,
      listingName: listing.listingName,
      listingUrl: listing.listingUrl,
      listingRedirectUrl: `https://pokeprice.io/redirect/ebay?redirectUrl=${encodeURIComponent(listing.listingUrl)}`,
      listingTypes: listing.listingTypes.join('|'),
      listingEndTime: listing?.listingEndTime?.toDate().toISOString() ?? null,
      listingCreatedTime: listing.dateCreated.toDate().toISOString(),
      scoreParts: listing.buyingOpportunity.scoreParts.map(part => `${part.reason}:${part.scoreChange}`).join('|'),
      soldVolume: listing.buyingOpportunity.soldVolume,
      soldPrice: fromCurrencyAmountLike(listing.buyingOpportunity.soldPrice).toString(),
      currentListingPrice: fromCurrencyAmountLike(listing.buyingOpportunity.currentListingPrice).toString(),
      soldMinPrice: listing.buyingOpportunity.soldMinPrice ? fromCurrencyAmountLike(listing.buyingOpportunity.soldMinPrice).toString() : null,
      soldLowPrice: listing.buyingOpportunity.soldLowPrice ? fromCurrencyAmountLike(listing.buyingOpportunity.soldLowPrice).toString() : null,
      canBuyNow: listing.buyingOpportunity.canBuyNow,
      belowSoldPriceScore: listing.buyingOpportunity.scoreParts.find(part => part.reason === 'PRICE_BELOW_SOLD_PRICE')?.scoreChange ?? 0,
      belowMinSoldPriceScore:listing.buyingOpportunity.scoreParts.find(part => part.reason === 'PRICE_BELOW_MIN_SOLD_PRICE')?.scoreChange ?? 0,
      belowLowSoldPriceScore:listing.buyingOpportunity.scoreParts.find(part => part.reason === 'PRICE_BELOW_LOW_SOLD_PRICE')?.scoreChange ?? 0,
      listingEndsInFourHoursScore:listing.buyingOpportunity.scoreParts.find(part => part.reason === 'LISTING_ENDS_IN_FOUR_HOURS')?.scoreChange ?? 0,
      listingEndsInEightHoursScore:listing.buyingOpportunity.scoreParts.find(part => part.reason === 'LISTING_ENDS_IN_EIGHT_HOURS')?.scoreChange ?? 0,
      listingEndsInSixteenHoursScore:listing.buyingOpportunity.scoreParts.find(part => part.reason === 'LISTING_ENDS_IN_SIXTEEN_HOURS')?.scoreChange ?? 0,
      profitScore:listing.buyingOpportunity.scoreParts.find(part => part.reason === 'POTENTIAL_PROFIT')?.scoreChange ?? 0,
      volumeScore:listing.buyingOpportunity.scoreParts.find(part => part.reason === 'SELLING_VOLUME')?.scoreChange ?? 0,
      score: listing.buyingOpportunity.score,
    }
  }))
  logger.info(`Returning ${results.length} top listings after filtering`)
  return results;
}

const retrieve = async ():Promise<string> => {
  const rows = await retrieveRows()
  return jsonToCsv.parse(rows);
}

export const topBuyingOpportunityCsvRetriever = {
  retrieve,
}