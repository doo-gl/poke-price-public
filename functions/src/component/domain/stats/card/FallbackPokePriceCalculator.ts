// import {CardPriceStats} from "./CardPriceStatsCalculator";
// import {Moment} from "moment";
// import {historicalCardPriceRetriever} from "../../historical-card-price/HistoricalCardPriceRetriever";
// import {CardDataSource} from "../../card/CardDataSource";
// import {HistoricalCardPriceEntity} from "../../historical-card-price/HistoricalCardPriceEntity";
// import {timestampToMoment} from "../../../tools/TimeConverter";
// import {Zero} from "../../money/CurrencyAmount";
// import {currencyExchanger} from "../../money/CurrencyExchanger";
// import {CurrencyCode} from "../../money/CurrencyCodes";
// import {PriceStats} from "./v2/StatsCalculator";
// import {CardSoldStatsView} from "./v2/CardStatsRetriever";
// import moment from "moment/moment";
//
// export interface FallbackCardPriceStatsResponse {
//   stats: CardPriceStats,
//   mostRecentPrice:Moment,
// }
//
//
// const calculate = async (cardId:string):Promise<FallbackCardPriceStatsResponse|null> => {
//   const mostRecentTcgPlayerPrices = await historicalCardPriceRetriever.retrieveLastNPricesFromDataSource(
//     cardId,
//     CardDataSource.TCG_PLAYER,
//     1,
//   );
//   if (!mostRecentTcgPlayerPrices || mostRecentTcgPlayerPrices.length === 0) {
//     return null;
//   }
//   const mostRecentTcgPlayerPrice:HistoricalCardPriceEntity = mostRecentTcgPlayerPrices[0];
//   const price = mostRecentTcgPlayerPrice.currencyAmount;
//   const gbpPrice = await currencyExchanger.exchange(price, CurrencyCode.GBP, timestampToMoment(mostRecentTcgPlayerPrice.timestamp));
//   return {
//     mostRecentPrice: timestampToMoment(mostRecentTcgPlayerPrice.timestamp),
//     stats: {
//       cardPriceIds: [mostRecentTcgPlayerPrice.id],
//       count: 0,
//       min: gbpPrice,
//       median: gbpPrice,
//       mean: gbpPrice,
//       max: gbpPrice,
//       standardDeviation: Zero(gbpPrice.currencyCode).toCurrencyAmountLike(),
//     },
//   }
// }
//
// const calculateV2 = async (cardId:string):Promise<CardSoldStatsView|null> => {
//   const fallback = await calculate(cardId);
//   if (!fallback) {
//     return null;
//   }
//   return {
//     mostRecentSoldPrice: fallback.mostRecentPrice,
//     cardPriceIds: fallback.stats.cardPriceIds,
//     from: fallback.mostRecentPrice,
//     to: moment(),
//     count: fallback.stats.count,
//     min: fallback.stats.min,
//     median: fallback.stats.median,
//     mean: fallback.stats.mean,
//     max: fallback.stats.max,
//     standardDeviation: fallback.stats.standardDeviation,
//   }
// }
//
// export const fallbackPokePriceCalculator = {
//   calculate,
//   calculateV2,
// }