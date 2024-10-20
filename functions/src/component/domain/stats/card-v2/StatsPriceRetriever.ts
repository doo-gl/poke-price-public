import {CardStatsEntityV2} from "./CardStatsEntityV2";
import {CurrencyAmountLike} from "../../money/CurrencyAmount";
import {Moment} from "moment";
import {PriceType} from "./CardPriceSelectionEntity";
import {UnexpectedError} from "../../../error/UnexpectedError";
import moment from "moment/moment";
import {timestampToMoment} from "../../../tools/TimeConverter";
import {HistoricalCardPriceEntity, State} from "../../historical-card-price/HistoricalCardPriceEntity";
import {EbayOpenListingEntity, ListingState, ListingType} from "../../ebay/open-listing/EbayOpenListingEntity";
import {comparatorBuilder} from "../../../infrastructure/ComparatorBuilder";
import {historicalCardPriceRetriever} from "../../historical-card-price/HistoricalCardPriceRetriever";
import {ebayOpenListingRetriever} from "../../ebay/open-listing/EbayOpenListingRetriever";
import {PriceDataType} from "../../historical-card-price/PriceDataType";
import {ebayCardSearchParamCreator} from "../../ebay/search-param/EbayCardSearchParamCreator";
import {ItemModification} from "../../modification/ItemModification";

export interface Price {
  id:string,
  selectionIds:Array<string>,
  price:CurrencyAmountLike,
  timestamp:Moment,
  listing:EbayOpenListingEntity|null,
  soldPrice:HistoricalCardPriceEntity|null,
  itemModification:ItemModification|null,
}

export interface StatsPrices {
  prices:Array<Price>,
  nextPriceAfterTimeBound:Price|null,
}

const BY_TIMESTAMP_ASC = comparatorBuilder.combine<Price>(
  comparatorBuilder.objectAttributeASC<Price,number>(value => value.timestamp.toDate().getTime()),
  comparatorBuilder.objectAttributeASC<Price,string>(value => value.id),
)

const mapSold = (price:HistoricalCardPriceEntity):Price => {
  return {
    id: price.id,
    price: price.currencyAmount,
    selectionIds: price.selectionIds,
    timestamp: timestampToMoment(price.timestamp),
    listing: null,
    soldPrice: price,
    itemModification: price.itemModification ?? null,
  }
}

const mapSolds = (prices:Array<HistoricalCardPriceEntity>):StatsPrices => {
  return {
    prices: prices
      .filter(price => price.state === State.ACTIVE && price.priceDataType === PriceDataType.SOLD_PRICE)
      .map(mapSold)
      .sort(BY_TIMESTAMP_ASC),
    nextPriceAfterTimeBound: null,
  }
}

const retrieveSoldPrices = async (stats:CardStatsEntityV2):Promise<StatsPrices> => {
  const startTimeBound = moment().subtract(stats.periodSizeDays, 'days')
  const endTimeBound = moment()
  const prices = await historicalCardPriceRetriever.retrieveBySelectionIdInTimeBounds(stats.selectionId, startTimeBound, endTimeBound)
  return mapSolds(prices)
}

const retrieveAllSoldsByCardId = async (cardId:string, periodSizeDays:number):Promise<StatsPrices> => {
  const startTimeBound = moment().subtract(periodSizeDays, 'days')
  const endTimeBound = moment()
  const prices = await historicalCardPriceRetriever.retrieveByCardIdInTimeBounds(cardId, startTimeBound, endTimeBound)
  return mapSolds(prices)
}

const mapListing = (price:EbayOpenListingEntity):Price => {
  return {
    id: price.id,
    price: price.mostRecentPrice,
    selectionIds: price.selectionIds,
    timestamp: price.listingEndTime
      ? timestampToMoment(price.listingEndTime)
      : moment().add(5, 'minutes'), // add 5 minutes so that calculations checking for prices today catch this price
    listing: price,
    soldPrice: null,
    itemModification: price.itemModification ?? null,
  }
}

const calculateListingPricesInTimeBound = (prices:Array<Price>, startTimeBound:Moment, endTimeBound:Moment):StatsPrices => {
  const timeBoundPrices:Array<Price> = [];
  let nextPriceAfterTimeBound:Price|null = null;
  prices.forEach(price => {
    const isPriceInTimeBound = startTimeBound.isSameOrBefore(price.timestamp) && endTimeBound.isSameOrAfter(price.timestamp)
    if (isPriceInTimeBound) {
      timeBoundPrices.push(price);
    }
    if (price.timestamp.isAfter(endTimeBound) && !nextPriceAfterTimeBound) {
      nextPriceAfterTimeBound = price;
    }
  })
  return {
    prices: timeBoundPrices,
    nextPriceAfterTimeBound,
  }
}

const mapListings = (listings:Array<EbayOpenListingEntity>, startTimeBound:Moment, endTimeBound:Moment):StatsPrices => {
  const allPrices = listings
    .filter(
      listing =>
        listing.state === ListingState.OPEN
        && listing.listingTypes.some(listingType => listingType === ListingType.BID || ListingType.BUY_IT_NOW))
    .map(mapListing)
    .sort(BY_TIMESTAMP_ASC)
  return calculateListingPricesInTimeBound(allPrices, startTimeBound, endTimeBound)
}

const retrieveListingPrices = async (stats:CardStatsEntityV2):Promise<StatsPrices> => {
  const startTimeBound = moment()
  const endTimeBound = moment().add(stats.periodSizeDays, 'days')
  const listings = await ebayOpenListingRetriever.retrieveBySelectionId(stats.selectionId);
  return mapListings(listings, startTimeBound, endTimeBound)
}

const retrieveAllListingsByCardId = async (cardId:string, periodSizeDays:number):Promise<StatsPrices> => {
  const startTimeBound = moment()
  const endTimeBound = moment().add(periodSizeDays, 'days')
  const searchParams = await ebayCardSearchParamCreator.getOrCreateSearchParams(cardId)
  const listings = await ebayOpenListingRetriever.retrieveOpenByCardIdAndBySearchId(cardId, searchParams.id);
  return mapListings(listings, startTimeBound, endTimeBound)
}

const mapListingPricesToStatPrices = (prices:Array<Price>, periodSizeDays:number):StatsPrices => {
  const startTimeBound = moment()
  const endTimeBound = moment().add(periodSizeDays, 'days')
  prices.slice().sort(BY_TIMESTAMP_ASC)
  const filteredPrices = prices.filter(price =>
    price.timestamp.isSameOrAfter(startTimeBound)
    && price.timestamp.isBefore(endTimeBound)
  )
  return calculateListingPricesInTimeBound(filteredPrices, startTimeBound, endTimeBound)
}

const mapSoldPricesToStatPrices = (prices:Array<Price>, periodSizeDays:number):StatsPrices => {
  const startTimeBound = moment().subtract(periodSizeDays, 'days')
  const endTimeBound = moment()
  prices.slice().sort(BY_TIMESTAMP_ASC)
  const filteredPrices = prices.filter(price =>
    price.timestamp.isSameOrAfter(startTimeBound)
    && price.timestamp.isBefore(endTimeBound)
  )
  return {
    prices: filteredPrices,
    nextPriceAfterTimeBound: null,
  }
}

const retrievePrices = async (stats:CardStatsEntityV2):Promise<StatsPrices> => {

  if (stats.priceType === PriceType.SOLD_PRICE) {
    return retrieveSoldPrices(stats)
  }
  if (stats.priceType === PriceType.LISTING_PRICE) {
    return retrieveListingPrices(stats)
  }
  throw new UnexpectedError(`Unrecognised price type: ${stats.priceType} on stats: ${stats.id}`)
}

const retrieveAllByCardId = (cardId:string, priceType:PriceType, periodSizeDays:number):Promise<StatsPrices> => {
  if (priceType === PriceType.SOLD_PRICE) {
    return retrieveAllSoldsByCardId(cardId, periodSizeDays)
  }
  if (priceType === PriceType.LISTING_PRICE) {
    return retrieveAllListingsByCardId(cardId, periodSizeDays)
  }
  throw new UnexpectedError(`Unrecognised price type: ${priceType}`)
}

const retrievePricesByIds = async (stats:CardStatsEntityV2):Promise<Array<Price>> => {
  if (stats.priceType === PriceType.SOLD_PRICE) {
    const prices = await historicalCardPriceRetriever.retrieveByIds(stats.itemIds);
    return prices.map(mapSold).sort(BY_TIMESTAMP_ASC)
  }
  if (stats.priceType === PriceType.LISTING_PRICE) {
    const prices = await ebayOpenListingRetriever.retrieveByIds(stats.itemIds);
    return prices.map(mapListing).sort(BY_TIMESTAMP_ASC)
  }
  throw new UnexpectedError(`Unrecognised price type: ${stats.priceType} on stats: ${stats.id}`)
}

const retrieveByCardIdAndPriceTypeForStats = async (cardId:string, priceType:PriceType, stats:Array<CardStatsEntityV2>):Promise<StatsPrices> => {
  const largestPeriod = stats
    .filter(stat => stat.priceType === priceType && stat.cardId === cardId)
    .map(stat => stat.periodSizeDays)
    .reduce((curr, next) => Math.max(curr, next), -1)
  if (largestPeriod > 0) {
    return retrieveAllByCardId(cardId, priceType, largestPeriod)
  }

  return priceType === PriceType.SOLD_PRICE
    ? retrieveAllByCardId(cardId, priceType, 100)
    : retrieveAllByCardId(cardId, priceType, 20)
}

export const statsPriceRetriever = {
  retrievePrices,
  retrievePricesByIds,
  retrieveAllByCardId,
  retrieveByCardIdAndPriceTypeForStats,
  calculateListingPricesInTimeBound,
  mapListingPricesToStatPrices,
  mapSoldPricesToStatPrices,
  mapSold,
  mapListing,
}