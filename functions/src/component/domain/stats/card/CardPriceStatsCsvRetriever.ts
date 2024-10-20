// import moment, {Moment} from "moment";
// import {CardId} from "../../card/UniqueCard";
// import {jsonToCsv} from "../../../external-lib/JsonToCsv";
// import {CardPriceStatsEntity} from "./CardPriceStatsEntity";
// import {cardPriceStatsRetriever} from "./CardPriceStatsRetriever";
// import {timestampToMoment} from "../../../tools/TimeConverter";
// import {fromCurrencyAmountLike} from "../../money/CurrencyAmount";
// import {CurrencyCode} from "../../money/CurrencyCodes";
// import {CsvType} from "./CardPriceStatsEndpoints";
// import {logger} from "firebase-functions";
// import {removeNulls} from "../../../tools/ArrayNullRemover";
// import {PriceStats} from "./v2/StatsCalculator";
// import {UnexpectedError} from "../../../error/UnexpectedError";
//
//
// export type CardPriceStatsCsvRequest = {
//   // priceType:PriceDataType,
// }
//
// export interface CardPriceStatsCsvResponse extends CardId {
//   mostRecentPrice:Moment,
//   currencyCode:CurrencyCode,
//   type:CsvType,
//   min:string,
//   mean:string,
//   median:string,
//   max:string,
//   standardDeviation:string,
//   count:number,
// }
//
// const pickStats = (statsEntity:CardPriceStatsEntity, type:CsvType):PriceStats|null => {
//   if (type === CsvType.POKE_PRICE) {
//     return statsEntity.shortViewStats
//   }
//   if (type === CsvType.LONG_VIEW) {
//     return statsEntity.longViewStats;
//   }
//   if (type === CsvType.OPEN_LISTINGS) {
//     return statsEntity.openListingStats
//   }
//   throw new UnexpectedError(`Unknown csv type: ${type}`)
// }
//
// const retrieve = async (csvType:CsvType):Promise<string> => {
//   const allStats:Array<CardPriceStatsEntity> = await cardPriceStatsRetriever.retrieveAll();
//   const responses:Array<CardPriceStatsCsvResponse|null> = allStats
//     .map(entity => {
//       const stats = pickStats(entity, csvType)
//       if (!stats) {
//         logger.error(`Unexpected card stats without stats, cardId: ${entity.cardId}, type: ${csvType}`)
//         return null;
//       }
//       return {
//         cardId: entity.cardId,
//         type: csvType,
//         currencyCode: stats.median.currencyCode,
//         count: stats.count,
//         min: fromCurrencyAmountLike(stats.min).toString(),
//         mean: fromCurrencyAmountLike(stats.mean).toString(),
//         median: fromCurrencyAmountLike(stats.median).toString(),
//         max: fromCurrencyAmountLike(stats.max).toString(),
//         standardDeviation: fromCurrencyAmountLike(stats.standardDeviation).toString(),
//         mostRecentPrice: entity.mostRecentPrice ? timestampToMoment(entity.mostRecentPrice) : moment(0),
//       }
//   })
//   return jsonToCsv.parse(removeNulls(responses));
// }
//
// export const cardPriceStatsCsvRetriever = {
//   retrieve,
// }