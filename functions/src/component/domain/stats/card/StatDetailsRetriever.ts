// import {HistoricalCardPriceEntity} from "../../historical-card-price/HistoricalCardPriceEntity";
// import {CardPriceStats} from "./CardPriceStatsCalculator";
// import {cardPriceStatsRetriever} from "./CardPriceStatsRetriever";
// import {handleAllErrors} from "../../../tools/AllPromiseHandler";
// import {historicalCardPriceRepository} from "../../historical-card-price/HistoricalCardPriceRepository";
// import {flattenArray} from "../../../tools/ArrayFlattener";
//
// export interface StatDetails {
//   pricesForPokePrice:Array<HistoricalCardPriceEntity>,
//   pokePriceStats:CardPriceStats,
// }
//
// const retrieve = async (cardStatsId:string):Promise<StatDetails> => {
//   const stats = await cardPriceStatsRetriever.retrieve(cardStatsId);
//   const priceIds = stats.pokePriceStats.cardPriceIds;
//   if (!priceIds || priceIds.length === 0) {
//     return {
//       pokePriceStats: stats.pokePriceStats,
//       pricesForPokePrice: [],
//     }
//   }
//   const priceIdBatches:Array<Array<string>> = [];
//   priceIds.forEach(priceId => {
//     let batch:Array<string>;
//     if (priceIdBatches.length === 0 || priceIdBatches[priceIdBatches.length - 1].length === 10) {
//       batch = [];
//     } else {
//       batch = priceIdBatches[priceIdBatches.length - 1];
//     }
//     batch.push(priceId);
//     if (priceIdBatches.length === 0 || batch.length === 10) {
//       priceIdBatches.push(batch);
//     } else {
//       priceIdBatches[priceIdBatches.length - 1] = batch;
//     }
//   });
//   const resultBatches:Array<Array<HistoricalCardPriceEntity>> = await handleAllErrors(
//     priceIdBatches.map((priceIdBatch) => historicalCardPriceRepository.getMany([{ field: "id", operation: "in", value: priceIdBatch }])),
//     'Failed to fetch price batch'
//   );
//   const prices = flattenArray(resultBatches);
//   return {
//     pokePriceStats: stats.pokePriceStats,
//     pricesForPokePrice: prices,
//   }
// }
//
// export const statDetailsRetriever = {
//   retrieve,
// }