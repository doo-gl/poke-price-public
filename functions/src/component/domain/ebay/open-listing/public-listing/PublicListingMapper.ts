
import {EbayOpenListingEntity, ListingType as EbayListingType} from "../EbayOpenListingEntity";
import {EbayListingDetails, ListingDto, ListingType} from "./PublicOpenListingDto";
import {timestampToMoment} from "../../../../tools/TimeConverter";
import {toSet} from "../../../../tools/SetBuilder";
import {exchangeRatesApiClient} from "../../../../client/ExchangeRatesApiClient";
import moment from "moment/moment";
import {CurrencyCode} from "../../../money/CurrencyCodes";
import {removeNulls} from "../../../../tools/ArrayNullRemover";
import {currencyExchanger} from "../../../money/CurrencyExchanger";
import {ItemDetails} from "../BuyingOpportunityCalculator";
import {
  CurrencyAmountLike,
  fromCurrencyAmountLike,
  fromOptionalCurrencyAmountLike,
} from "../../../money/CurrencyAmount";
import {valueTagExtractor} from "../../../card/query/ValueTagExtractor";
import {conditionalPokePriceConverter} from "../../../stats/card-v2/ConditionalPokePriceConverter";
import {comparatorBuilder} from "../../../../infrastructure/ComparatorBuilder";
import {buyingOpportunityCalculatorV2} from "../BuyingOpportunityCalculatorV2";
import {ItemEntity} from "../../../item/ItemEntity";
import {itemPriceQuerier} from "../../../item/ItemPriceQuerier";
import {itemValueTagExtractor} from "../../../item/tag/ItemValueTagExtractor";


const mapFromCardAndEbayListings = async (card:ItemEntity, localeCurrencyCode:CurrencyCode, listings:Array<EbayOpenListingEntity>):Promise<Array<ListingDto>> => {

  const currencyCodes = toSet(listings, i => i.mostRecentPrice.currencyCode)
  const currencyCodeToRate = new Map<string, number>();
  await Promise.all(
    [...currencyCodes.values()].map(async currencyCode => {
      const response = await exchangeRatesApiClient.getRateCached(
        currencyCode,
        localeCurrencyCode,
        moment()
      )
      if (!response) {
        return
      }
      currencyCodeToRate.set(currencyCode, response.rate)
    })
  )

  const results = listings
    .map(listing => mapFromCardAndEbayListing(
      card,
      localeCurrencyCode,
      currencyCodeToRate,
      listing
    ))
    .sort(comparatorBuilder.objectAttributeDESC(value => value?.priority))
  return removeNulls(results)
}

const calculatePriority = (
  card:ItemEntity,
  rate:number,
  listing:EbayOpenListingEntity,
  localeListingPrice:CurrencyAmountLike,
  localeBuyItNowPrice:CurrencyAmountLike|null,
):{priority:number, itemPrice:CurrencyAmountLike|null} => {
  const currencyCode = localeListingPrice.currencyCode
  const soldDetails = itemPriceQuerier.soldDetails(card, currencyCode);
  if (!soldDetails || !soldDetails.price) {
    return { priority: 0, itemPrice: null }
  }
  const soldVolume = itemValueTagExtractor.calculateSoldVolume(card.itemPrices, currencyCode)
  if (!soldVolume) {
    return { priority: 0, itemPrice: null }
  }
  const soldMinPrice = fromOptionalCurrencyAmountLike(soldDetails.minPrice)
  const soldLowPrice = fromOptionalCurrencyAmountLike(soldDetails.lowPrice)
  const soldPrice = fromCurrencyAmountLike(soldDetails.price)

  const condition = listing.condition;

  const localeSoldMinPrice = soldMinPrice ? currencyExchanger.convert(soldMinPrice, localeListingPrice.currencyCode, rate) : null
  const localeSoldLowPrice = soldLowPrice ? currencyExchanger.convert(soldLowPrice, localeListingPrice.currencyCode, rate) : null
  const localeSoldPrice = currencyExchanger.convert(soldPrice, localeListingPrice.currencyCode, rate)

  const conditionalSoldMinPrice = localeSoldMinPrice ? conditionalPokePriceConverter.convert(localeSoldMinPrice, condition) : null;
  const conditionalSoldLowPrice = localeSoldLowPrice ? conditionalPokePriceConverter.convert(localeSoldLowPrice, condition) : null;
  const conditionalSoldPrice = conditionalPokePriceConverter.convert(localeSoldPrice, condition)

  const itemDetails:ItemDetails =  {
    soldMinPrice: fromOptionalCurrencyAmountLike(conditionalSoldMinPrice),
    soldLowPrice: fromOptionalCurrencyAmountLike(conditionalSoldLowPrice),
    soldPrice: fromCurrencyAmountLike(conditionalSoldPrice),
    soldVolume,
  }

  const opportunity = buyingOpportunityCalculatorV2.calculate(
    {
      price: localeListingPrice,
      numberOfBids: listing.mostRecentBidCount,
      buyItNowPrice: localeBuyItNowPrice,
      canBuyNow: listing.listingTypes.some(type => type === EbayListingType.BUY_IT_NOW),
      listingEndTime: listing.listingEndTime ? timestampToMoment(listing.listingEndTime) : null,
    },
    itemDetails
  )
  if (!opportunity) {
    return { priority: 0, itemPrice: conditionalSoldPrice }
  }
  return { priority: opportunity.score, itemPrice: conditionalSoldPrice };
}

const mapFromCardAndEbayListing = (
  card:ItemEntity,
  localeCurrencyCode:CurrencyCode,
  currencyCodeToRate:Map<string, number>,
  listing:EbayOpenListingEntity
):ListingDto|null => {
  const listingDetails:EbayListingDetails = {
    bidCount: listing.mostRecentBidCount,
    ebayListingTypes: listing.listingTypes,
    listingEndTime: listing.listingEndTime
      ? timestampToMoment(listing.listingEndTime).toISOString()
      : null,
    condition: listing.condition,
  }
  const listingPrice = listing.mostRecentPrice;
  const buyItNowPrice = listing.buyItNowPrice;
  const rate = currencyCodeToRate.get(listingPrice.currencyCode)
  const buyItNowRate = buyItNowPrice ? currencyCodeToRate.get(buyItNowPrice.currencyCode) : null;
  if (!rate) {
    return null
  }
  const localeListingPrice = currencyExchanger.convert(listingPrice, localeCurrencyCode, rate)
  const localeBuyItNowPrice = buyItNowPrice && buyItNowRate
    ? currencyExchanger.convert(buyItNowPrice, localeCurrencyCode, buyItNowRate)
    : null;
  const priority = calculatePriority(card, rate, listing, localeListingPrice, localeBuyItNowPrice)
  return {
    listingId: listing.id,
    priority: priority.priority,
    itemId: listing.cardId,
    itemPrice: priority.itemPrice,
    listingPrice,
    localeListingPrice,
    lastListingUpdate: timestampToMoment(listing.mostRecentUpdate).toISOString(),
    listingUrl: listing.listingUrl,
    listingType: ListingType.EBAY,
    listingDetails,
  }
}

export const publicListingMapper = {
  mapFromCardAndEbayListings,
  mapFromCardAndEbayListing,
}