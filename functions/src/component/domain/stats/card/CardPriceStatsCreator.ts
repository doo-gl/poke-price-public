import {CardPriceStatsEntity, SoldStats} from "./CardPriceStatsEntity";
import {cardPriceStatsRetriever} from "./CardPriceStatsRetriever";
import {UniqueSet, uniqueSetIdentifier} from "../../set/UniqueSet";
import {setRetriever} from "../../set/SetRetriever";
import {handleAllErrors} from "../../../tools/AllPromiseHandler";
import {Create} from "../../../database/Entity";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {Zero} from "../../money/CurrencyAmount";
import {cardPriceStatsRepository} from "./CardPriceStatsRepository";
import {logger} from "firebase-functions";
import {EbayCardSearchParamEntity} from "../../ebay/search-param/EbayCardSearchParamEntity";
import {ebaySearchParamRetriever} from "../../ebay/search-param/EbayCardSearchParamRetriever";
import {UnexpectedError} from "../../../error/UnexpectedError";
import {ebayOpenListingUrlCreator} from "../../ebay/card-price/open-listing-retrieval/EbayOpenListingUrlCreator";
import {TimestampStatic} from "../../../external-lib/Firebase";
import {ItemEntity, languageOrFallback, legacyIdOrFallback} from "../../item/ItemEntity";
import {cardItemRetriever} from "../../item/CardItemRetriever";
import {toCardOrThrow} from "../../item/CardItem";


const create = async (card:ItemEntity, searchParams:EbayCardSearchParamEntity):Promise<CardPriceStatsEntity> => {
  const preExistingStats = await cardPriceStatsRetriever.retrieveStatsForCard(legacyIdOrFallback(card));
  if (preExistingStats) {
    logger.info(`Found pre-existing card price stats with id: ${legacyIdOrFallback(card)}, not creating new`)
    return preExistingStats;
  }
  const currencyCode = CurrencyCode.GBP;
  const zero = Zero(currencyCode).toCurrencyAmountLike();
  const initialStats:SoldStats = {
    min: zero,
    mean: zero,
    median: zero,
    max: zero,
    standardDeviation: zero,
    from: null,
    to: null,
    mostRecentSoldPrice: null,
    cardPriceIds: [],
    count: 0,
  }
  const details = toCardOrThrow(card)
  const createStats:Create<CardPriceStatsEntity> = {
    cardId: legacyIdOrFallback(card),
    series: details.series,
    set: details.set,
    numberInSet: details.cardNumber,
    variant: details.variant,
    language: languageOrFallback(details.language),
    lastCalculationTime: TimestampStatic.fromMillis(0),
    mostRecentPrice: TimestampStatic.fromMillis(0),
    searchUrl: searchParams.searchUrl,
    openListingUrl: ebayOpenListingUrlCreator.create(searchParams),
    searchId: searchParams.id,
    longViewStats: initialStats,
    shortViewStats: initialStats,
    pokePriceStats: initialStats,
    openListingStats: null,
  };
  logger.info(`Creating new card price stats for card with id: ${legacyIdOrFallback(card)}`);
  const createdStats = await cardPriceStatsRepository.create(createStats);
  logger.info(`Created new card price stats with id: ${createdStats.id}, for card with id: ${legacyIdOrFallback(card)}`);
  return createdStats;
}

const createForSet = async (set:UniqueSet):Promise<Array<CardPriceStatsEntity>> => {
  await setRetriever.retrieveSet(set); // ensure the set exists
  const cards = await cardItemRetriever.retrieveByUniqueSet(set);
  logger.info(`Found ${cards.length} in set: ${uniqueSetIdentifier.createMappingKey(set)}, creating card price stats.`)
  const cardStats = await handleAllErrors(
    cards.map(async card => {
      const searchParams = await ebaySearchParamRetriever.retrieveSearchParamsForCardId(legacyIdOrFallback(card));
      if (searchParams.length !== 1) {
        throw new UnexpectedError(`Found multiple search params for card with id: ${legacyIdOrFallback(card)}`);
      }
      return create(card, searchParams[0]);
    }),
    `Failed to create card stats`,
  );
  logger.info(`Created ${cardStats.length} card price stats for set: ${uniqueSetIdentifier.createMappingKey(set)}`);
  return cardStats;
}

export const cardPriceStatsCreator = {
  create,
  createForSet,
}