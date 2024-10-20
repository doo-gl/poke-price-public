import {CurrencyAmountLike} from "../money/CurrencyAmount";
import {CardEntity, CardVariant, Image} from "../card/CardEntity";
import {ApiList} from "../PagingResults";
import {PriceType} from "../stats/card-v2/CardPriceSelectionEntity";
import {CardCondition} from "../historical-card-price/CardCondition";
import {recentPriceMetadataRetriever} from "./RecentPriceMetadataRetriever";
import {recentPriceMetadataCreator, RecentPriceMetadataEntity} from "./RecentPriceMetadataEntity";
import moment from "moment/moment";
import {momentToTimestamp, timestampToMoment} from "../../tools/TimeConverter";
import {Moment} from "moment";
import {toInputValueMap} from "../../tools/MapBuilder";
import {removeNulls} from "../../tools/ArrayNullRemover";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {CurrencyCode} from "../money/CurrencyCodes";
import {currencyExchanger} from "../money/CurrencyExchanger";
import {ebayOpenListingRetriever} from "../ebay/open-listing/EbayOpenListingRetriever";
import {EbayOpenListingEntity, ListingState} from "../ebay/open-listing/EbayOpenListingEntity";
import {isProduction} from "../../infrastructure/ProductionDecider";
import {fakeListingGenerator} from "./FakeListingGenerator";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {ItemEntity, legacyIdOrFallback} from "../item/ItemEntity";
import {toCard} from "../item/CardItem";
import {itemPriceQuerier} from "../item/ItemPriceQuerier";
import {cardImageToImageMapper} from "../item/CardImageToImageMapper";

const MIN_TIME_BETWEEN_REVEALS_MILLISECONDS = 5000

const MAX_PRICES_TO_REVEAL = 10;

export interface RecentPriceDto {
  price:CurrencyAmountLike,
  localePrice:CurrencyAmountLike,
  pokePrice:CurrencyAmountLike|null,
  timestamp:string,
  priceRevealTimestamp:string
  url:string
  cardId:string,
  cardImage:Image,
  cardName:string,
  cardNumber:string,
  setNumber:string,
  setId:string,
  priceId:string,
  priceType:PriceType,
  condition:CardCondition,
  variant:CardVariant,
}

interface PartialPriceDto {
  price:CurrencyAmountLike,
  localePrice:CurrencyAmountLike,
  timestamp:Moment,
  dateCreated:Moment,
  cardId:string,
  priceId:string,
  url:string,
  priceType:PriceType,
  condition:CardCondition,
}

interface PartialPriceWithRevealDto extends PartialPriceDto {
  priceRevealTimestamp:Moment,
}

const mapLocalePrice = async (price:CurrencyAmountLike):Promise<CurrencyAmountLike> => {
  if (price.currencyCode === CurrencyCode.GBP) {
    return price
  }
  return currencyExchanger.exchange(price, CurrencyCode.GBP, moment())
}

const getFromId = async ():Promise<string|null> => {
  if (!isProduction()) {
    return 'FROM_ID'
  }

  const mostRecentMetadata = await recentPriceMetadataRetriever.retrieveMostRecent();

  const startOfMaxTimeWindow = moment().subtract(1, 'hour')
  if (mostRecentMetadata?.revealToListingId) {
    const metadataLastListing = await ebayOpenListingRetriever.retrieve(mostRecentMetadata.revealToListingId)
    const lastListingCreatedAt = timestampToMoment(metadataLastListing.dateCreated)
    if (lastListingCreatedAt.isSameOrAfter(startOfMaxTimeWindow)) {
      return metadataLastListing.id
    }
  }

  const firstListingInTimeWindow = await ebayOpenListingRetriever.retrieveFirstCreatedAfterDate(startOfMaxTimeWindow)
  return firstListingInTimeWindow?.id ?? null
}

const isListingValid = (listing:EbayOpenListingEntity):boolean => {
  return listing.state === ListingState.OPEN
}

const retrieveListings = async (fromId:string, limit:number):Promise<Array<EbayOpenListingEntity>> => {

  const listings = await ebayOpenListingRetriever.retrieveFromIdByDateCreatedAsc(fromId, limit)
  const filteredListings = listings.filter(isListingValid);

  const numberOfFilteredListings = listings.length - filteredListings.length
  if (numberOfFilteredListings > 0) {
    const lastListing = listings[listings.length - 1]
    return filteredListings.concat(await retrieveListings(lastListing.id, numberOfFilteredListings))
  }

  return filteredListings
}

const retrieveListingPrices = async (fromId:string):Promise<Array<PartialPriceDto>> => {
  const prices = isProduction()
    ? await retrieveListings(fromId, MAX_PRICES_TO_REVEAL)
    : await fakeListingGenerator.retrieveFakeListings(10)
  return await Promise.all(prices.map(mapToPartialPrice))
}

const retrieveAlreadyRevealedListingPrices = async (fromId:string):Promise<Array<PartialPriceDto>> => {
  const prices = isProduction()
    ? await ebayOpenListingRetriever.retrievePricesCreatedBeforeId(fromId, 10)
    : await fakeListingGenerator.retrieveFakeListings(10)
  return await Promise.all(
    prices
      .filter(isListingValid)
      .map(mapToPartialPrice)
  )
}

const mapToPartialPrice = async (listing:EbayOpenListingEntity) => {
  const localePrice = await mapLocalePrice(listing.mostRecentPrice);
  return {
    price: listing.mostRecentPrice,
    localePrice: localePrice,
    timestamp: timestampToMoment(listing.mostRecentUpdate),
    dateCreated: timestampToMoment(listing.dateCreated),
    cardId: listing.cardId,
    priceId: listing.id,
    url: listing.listingUrl,
    priceType: PriceType.LISTING_PRICE,
    condition: listing.condition,
  }
}

const addRevealTimes = (partialPriceDtos:Array<PartialPriceDto>, from:Moment, to:Moment):Array<PartialPriceWithRevealDto> => {
  const smallestMillisecondsBetweenReveals = Math.ceil(to.diff(from, 'milliseconds') / partialPriceDtos.length);
  const batchSize = Math.ceil(MIN_TIME_BETWEEN_REVEALS_MILLISECONDS / smallestMillisecondsBetweenReveals)
  const millisecondsBetweenReveals = Math.ceil(to.diff(from, 'milliseconds') / (partialPriceDtos.length / batchSize));
  const priceRevealTimestamp = from.clone().add(millisecondsBetweenReveals, 'milliseconds')
  let batchCount = 0
  return partialPriceDtos
    .map(dto => {
      const newDto:PartialPriceWithRevealDto = {
        ...dto,
        priceRevealTimestamp: priceRevealTimestamp.clone(),
      }
      batchCount++
      if (batchCount === batchSize) {
        priceRevealTimestamp.add(millisecondsBetweenReveals, 'milliseconds')
        batchCount = 0
      }
      return newDto
    })
}

const mapToRecentPriceDto = (price:PartialPriceWithRevealDto, card:ItemEntity):RecentPriceDto|null => {
  const details = toCard(card)
  if (!details) {
    return null;
  }
  const soldPrice = itemPriceQuerier.pokePrice(card)?.price ?? null;
  return {
    price: price.price,
    localePrice: price.localePrice,
    timestamp: price.timestamp.toISOString(),
    priceRevealTimestamp: price.priceRevealTimestamp.toISOString(),
    priceId: price.priceId,
    priceType: price.priceType,
    condition: price.condition,
    url: price.url,
    cardId: price.cardId,
    pokePrice: soldPrice ?? null,
    cardImage: cardImageToImageMapper.reverseMap(card.images.images[0]),
    cardName: card.displayName,
    cardNumber: details.cardNumber,
    setNumber: details.setNumber,
    setId: details.setId,
    variant: details.variant,
  }
}

const mapToRecentPriceDtos = async (pricesToReveal:Array<PartialPriceDto>, revealedPrices:Array<PartialPriceDto>):Promise<Array<RecentPriceDto>> => {

  const cardIds = new Set<string>()
  pricesToReveal.forEach(dto => cardIds.add(dto.cardId))
  revealedPrices.forEach(dto => cardIds.add(dto.cardId))

  const cards = await cardItemRetriever.retrieveByIds([...cardIds.values()]);
  const cardIdToCard = toInputValueMap(cards, card => legacyIdOrFallback(card));

  const now = moment();

  const sortedRevealedPrices = revealedPrices.sort(comparatorBuilder.objectAttributeASC(value => value.dateCreated.toDate().getTime()))
  const alreadyRevealedPricesStart = moment().subtract(MIN_TIME_BETWEEN_REVEALS_MILLISECONDS * (sortedRevealedPrices.length + 1), 'milliseconds')
  const alreadyRevealedPricesEnd = moment().subtract(MIN_TIME_BETWEEN_REVEALS_MILLISECONDS, 'milliseconds')
  const revealedPricesWithRevealTime = addRevealTimes(sortedRevealedPrices, alreadyRevealedPricesStart, alreadyRevealedPricesEnd)

  const sortedPricesToReveal = pricesToReveal.sort(comparatorBuilder.objectAttributeASC(value => value.dateCreated.toDate().getTime()))
  const pricesToRevealEnd = moment().add(MIN_TIME_BETWEEN_REVEALS_MILLISECONDS * sortedPricesToReveal.length, 'milliseconds')
  const pricesToRevealWithRevealTime = addRevealTimes(sortedPricesToReveal, now, pricesToRevealEnd)

  return removeNulls(
    revealedPricesWithRevealTime.concat(pricesToRevealWithRevealTime)
      .map(price => {
        const card = cardIdToCard.get(price.cardId)
        if (!card) {
          return null
        }
        return mapToRecentPriceDto(price, card)
      })
  )
}

const insertMetadata = async (recentPrices:Array<RecentPriceDto>):Promise<RecentPriceMetadataEntity> => {
  const firstListing = recentPrices.length > 0 ? recentPrices[0] : null
  const lastListing = recentPrices.length > 0 ? recentPrices[recentPrices.length - 1] : null
  const revealFromListingId = firstListing?.priceId ?? null
  const revealToListingId = lastListing?.priceId ?? null
  const revealingFrom = firstListing ? momentToTimestamp(moment(firstListing.priceRevealTimestamp)) : null;
  const revealingTo = lastListing ? momentToTimestamp(moment(lastListing.priceRevealTimestamp)) : null;
  return await recentPriceMetadataCreator.create({
    revealFromListingId,
    revealToListingId,
    revealingFrom,
    revealingTo,
    prices: recentPrices,
  })
}

const refreshMetadata = async (fromId:string):Promise<RecentPriceMetadataEntity> => {
  const alreadyRevealedPrices = await retrieveAlreadyRevealedListingPrices(fromId)
  const listingPricesToReveal = await retrieveListingPrices(fromId)
  const recentPrices = await mapToRecentPriceDtos(alreadyRevealedPrices, listingPricesToReveal);
  const refreshedMetadata = await insertMetadata(recentPrices);
  return refreshedMetadata;
}

const isMetadataStillValid = (metadata:RecentPriceMetadataEntity):boolean => {
  if (!metadata.revealingFrom || !metadata.revealingTo) {
    return false;
  }
  const now = moment();
  const revealingFrom = timestampToMoment(metadata.revealingFrom)
  const revealingTo = timestampToMoment(metadata.revealingTo);
  return revealingFrom.isSameOrBefore(now) && now.isBefore(revealingTo)
}

const retrieve = async ():Promise<ApiList<RecentPriceDto>> => {

  const now = moment()
  const metadata = await recentPriceMetadataRetriever.retrieveByRevealingTo(now)

  const validMetadata = metadata.filter(isMetadataStillValid)
  if (validMetadata.length >= 1) {
    return {
      results: metadata[0].prices,
      fromId: null,
    }
  }

  const fromId = await getFromId()
  if (!fromId) {
    return {
      results: [],
      fromId: null,
    }
  }

  const refreshedMetadata = await refreshMetadata(fromId);
  return {
    results: refreshedMetadata.prices,
    fromId: null,
  }
}

export const recentPriceRetriever = {
  retrieve,
}