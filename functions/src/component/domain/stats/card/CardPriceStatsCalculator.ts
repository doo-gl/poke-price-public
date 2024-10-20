// import {BY_CURRENCY_AMOUNT_ASC, HistoricalCardPriceEntity} from "../../historical-card-price/HistoricalCardPriceEntity";
// import {CurrencyCode} from "../../money/CurrencyCodes";
// import {CurrencyAmount, CurrencyAmountLike, fromCurrencyAmountLike, Max, Zero} from "../../money/CurrencyAmount";
// import {CardId, UniqueCard} from "../../card/UniqueCard";
// import moment, {Moment} from "moment";
// import {ebaySearchParamRetriever} from "../../ebay/search-param/EbayCardSearchParamRetriever";
// import {logger} from "firebase-functions";
// import {CardPriceStatsRequest, cardPriceStatsRequestRetriever} from "./CardPriceStatsRequestRetriever";
// import {PriceDataType} from "../../historical-card-price/PriceDataType";
// import {fallbackPokePriceCalculator} from "./FallbackPokePriceCalculator";
// import {timestampToMoment} from "../../../tools/TimeConverter";
// import {ebayOpenListingUrlCreator} from "../../ebay/card-price/open-listing-retrieval/EbayOpenListingUrlCreator";
// import {cardItemRetriever} from "../../item/CardItemRetriever";
// import {legacyIdOrFallback} from "../../item/ItemEntity";
// import {toCard} from "../../item/CardItem";
//
// export interface CardPriceStats {
//   count:number,
//   mean:CurrencyAmountLike,
//   min:CurrencyAmountLike,
//   max:CurrencyAmountLike,
//   median:CurrencyAmountLike,
//   standardDeviation: CurrencyAmountLike,
//   cardPriceIds:Array<string>,
// }
//
// export interface CombinedCardStats extends UniqueCard, CardId {
//   lastCalculationTime:Moment,
//   mostRecentPrice:Moment,
//   searchUrl:string|null,
//   openListingUrl:string|null,
//   searchId:string|null,
//   longViewStats:CardPriceStats,
//   pokePriceStats:CardPriceStats,
// }
//
// const calculateStandardDeviation = (mean:CurrencyAmount, cardPrices:Array<HistoricalCardPriceEntity>):CurrencyAmount => {
//   let totalSquaredDifference = Zero(mean.currencyCode);
//   cardPrices.forEach(price => {
//     const differenceFromMean = fromCurrencyAmountLike(price.currencyAmount).subtract(mean);
//     const squaredDifferenceFromMean = differenceFromMean.square();
//     totalSquaredDifference = totalSquaredDifference.add(squaredDifferenceFromMean);
//   });
//   const variance = totalSquaredDifference.divide(cardPrices.length);
//   const standardDeviation = variance.squareRoot();
//   return standardDeviation;
// }
//
// // TODO move this method to a different file to prevent cyclic dependency
// const calculate = (cardPrices:Array<HistoricalCardPriceEntity>):CardPriceStats|null => {
//   if (cardPrices.length === 0) {
//     return null;
//   }
//   const sortedPrices = cardPrices.slice().sort(BY_CURRENCY_AMOUNT_ASC);
//   const currencyCode:CurrencyCode = cardPrices[0].currencyAmount.currencyCode;
//   let totalAmount:CurrencyAmount = Zero(currencyCode);
//   let min:CurrencyAmount = Max(currencyCode);
//   let max:CurrencyAmount = Zero(currencyCode);
//   let median:CurrencyAmount = Zero(currencyCode);
//   for (let priceIndex = 0; priceIndex < sortedPrices.length; priceIndex++) {
//     const cardPrice = sortedPrices[priceIndex];
//     const currencyAmount = fromCurrencyAmountLike(cardPrice.currencyAmount);
//     totalAmount = totalAmount.add(currencyAmount);
//     if (currencyAmount.lessThan(min)) {
//       min = currencyAmount;
//     }
//     if (currencyAmount.greaterThan(max)) {
//       max = currencyAmount;
//     }
//     const isOddNumberOfElements = sortedPrices.length % 2 === 1;
//     const isHalfwayThroughPrices = priceIndex === Math.floor(sortedPrices.length / 2);
//     if (isOddNumberOfElements && isHalfwayThroughPrices) {
//       median = currencyAmount;
//     }
//     if (!isOddNumberOfElements && isHalfwayThroughPrices) {
//       const previousCardPrice = sortedPrices[priceIndex - 1];
//       const previousCurrencyAmount = fromCurrencyAmountLike(previousCardPrice.currencyAmount);
//       median = (currencyAmount.add(previousCurrencyAmount)).divide(2);
//     }
//   }
//   const count = cardPrices.length;
//   const mean = totalAmount.divide(count);
//   const standardDeviation = calculateStandardDeviation(mean, sortedPrices);
//   const cardPriceIds = cardPrices.map(price => price.id);
//   return {
//     count,
//     min: min.toCurrencyAmountLike(),
//     mean: mean.toCurrencyAmountLike(),
//     median: median.toCurrencyAmountLike(),
//     max: max.toCurrencyAmountLike(),
//     standardDeviation: standardDeviation.toCurrencyAmountLike(),
//     cardPriceIds,
//   }
// }
//
// const calculateForCard = async (cardId:string):Promise<CombinedCardStats|null> => {
//
//   const card = await cardItemRetriever.retrieve(cardId);
//   const ebaySearches = await ebaySearchParamRetriever.retrieveSearchParamsForCardId(legacyIdOrFallback(card));
//   if (!ebaySearches || ebaySearches.length === 0) {
//     return null;
//   }
//
//   if (ebaySearches.length > 1) {
//     logger.error(`Found multiple ebay search params for card with id: ${legacyIdOrFallback(card)}, expected 1`);
//   }
//   const ebaySearch = ebaySearches[0];
//
//   const hasBeenReconciledRecently = moment().subtract(30, 'days').isBefore(timestampToMoment(ebaySearch.lastReconciled));
//   if (!hasBeenReconciledRecently) {
//     logger.info(`Search with id: ${ebaySearch.id} has not been reconciled recently, last reconcile: ${timestampToMoment(ebaySearch.lastReconciled).toISOString()}`);
//     return null;
//   }
//
//   const twoWeeksAgo = moment().subtract(2, 'weeks');
//   const threeMonthsAgo = moment().subtract(3, 'months');
//
//   const longViewRequest:CardPriceStatsRequest = {
//     from: threeMonthsAgo,
//     to: null,
//     priceType: PriceDataType.SOLD_PRICE,
//     currencyCode: CurrencyCode.GBP,
//     lastNResults: 5,
//     cardId: legacyIdOrFallback(card),
//     searchId: ebaySearch.id,
//   };
//   const longViewStats = await cardPriceStatsRequestRetriever.retrieve(longViewRequest);
//
//   const pokePriceRequest:CardPriceStatsRequest = {
//     from: twoWeeksAgo,
//     to: null,
//     priceType: PriceDataType.SOLD_PRICE,
//     currencyCode: CurrencyCode.GBP,
//     lastNResults: 5,
//     cardId: legacyIdOrFallback(card),
//     searchId: ebaySearch.id,
//   };
//   const pokePriceStats = await cardPriceStatsRequestRetriever.retrieve(pokePriceRequest);
//
//   const details = toCard(card)
//   if (!details) {
//     return null;
//   }
//
//   if (!longViewStats.stats || !pokePriceStats.stats) {
//     const fallbackStats = await fallbackPokePriceCalculator.calculate(legacyIdOrFallback(card));
//     if (!fallbackStats) {
//       return null;
//     }
//     return {
//       cardId: legacyIdOrFallback(card),
//       series: details.series,
//       set: details.set,
//       numberInSet: details.cardNumber,
//       variant: details.variant,
//       lastCalculationTime: moment(),
//       mostRecentPrice: fallbackStats.mostRecentPrice,
//       searchUrl: null,
//       openListingUrl: null,
//       searchId: null,
//       pokePriceStats: fallbackStats.stats,
//       longViewStats: fallbackStats.stats,
//     };
//   }
//
//   const openListingUrl = ebayOpenListingUrlCreator.create(ebaySearch);
//   return {
//     cardId: legacyIdOrFallback(card),
//     series: details.series,
//     set: details.set,
//     numberInSet: details.cardNumber,
//     variant: details.variant,
//     lastCalculationTime: moment(),
//     mostRecentPrice: longViewStats.mostRecentPrice,
//     searchUrl: ebaySearch.searchUrl,
//     openListingUrl,
//     searchId: ebaySearch.id,
//     pokePriceStats: pokePriceStats.stats,
//     longViewStats: longViewStats.stats,
//   }
// }
//
// export const cardPriceStatsCalculator = {
//   calculate,
//   calculateForCard,
// }