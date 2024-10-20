// import moment, {Moment} from "moment";
// import {cardPriceStatsRequestValidator} from "./CardPriceStatsRequestValidator";
// import {HistoricalCardPriceEntity} from "../../historical-card-price/HistoricalCardPriceEntity";
// import {PriceDataType} from "../../historical-card-price/PriceDataType";
// import {historicalCardPriceRetriever} from "../../historical-card-price/HistoricalCardPriceRetriever";
// import {UnexpectedError} from "../../../error/UnexpectedError";
// import {CardPriceStats, cardPriceStatsCalculator} from "./CardPriceStatsCalculator";
// import {timestampToMoment} from "../../../tools/TimeConverter";
// import {CurrencyCode} from "../../money/CurrencyCodes";
// import {CardCondition} from "../../historical-card-price/CardCondition";
//
//
// export type CardPriceStatsRequest = {
//   from:Moment|null,
//   to:Moment|null,
//   lastNResults:number|null,
//   priceType:PriceDataType,
//   currencyCode:CurrencyCode,
//   cardId:string,
//   searchId:string,
// }
//
// export type CardPriceStatsResponse = {
//   request:CardPriceStatsRequest,
//   resultCount:number,
//   cardId:string,
//   mostRecentPrice:Moment,
//   stats:CardPriceStats|null,
// }
//
// const retrievePrices = async (cardPriceStatsRequest:CardPriceStatsRequest):Promise<Array<HistoricalCardPriceEntity>> => {
//   if (cardPriceStatsRequest.lastNResults && cardPriceStatsRequest.from && !cardPriceStatsRequest.to) {
//     const to = moment();
//     const prices = await historicalCardPriceRetriever.retrievePricesBetween(
//       cardPriceStatsRequest.cardId,
//       cardPriceStatsRequest.searchId,
//       PriceDataType.SOLD_PRICE,
//       cardPriceStatsRequest.currencyCode,
//       CardCondition.NEAR_MINT,
//       cardPriceStatsRequest.from,
//       to,
//     );
//     if (prices.length > cardPriceStatsRequest.lastNResults) {
//       return prices;
//     }
//     return historicalCardPriceRetriever.retrieveLastNPricesForSearch(
//       cardPriceStatsRequest.cardId,
//       cardPriceStatsRequest.searchId,
//       PriceDataType.SOLD_PRICE,
//       cardPriceStatsRequest.currencyCode,
//       CardCondition.NEAR_MINT,
//       cardPriceStatsRequest.lastNResults
//     );
//   }
//   if (cardPriceStatsRequest.lastNResults) {
//     return historicalCardPriceRetriever.retrieveLastNPricesForSearch(
//       cardPriceStatsRequest.cardId,
//       cardPriceStatsRequest.searchId,
//       PriceDataType.SOLD_PRICE,
//       cardPriceStatsRequest.currencyCode,
//       CardCondition.NEAR_MINT,
//       cardPriceStatsRequest.lastNResults
//     );
//   }
//   if (cardPriceStatsRequest.from) {
//     const to = cardPriceStatsRequest.to ? cardPriceStatsRequest.to : moment();
//     return historicalCardPriceRetriever.retrievePricesBetween(
//       cardPriceStatsRequest.cardId,
//       cardPriceStatsRequest.searchId,
//       PriceDataType.SOLD_PRICE,
//       cardPriceStatsRequest.currencyCode,
//       CardCondition.NEAR_MINT,
//       cardPriceStatsRequest.from,
//       to,
//     );
//   }
//   throw new UnexpectedError(`Card price stats request does not have lastNResults or from properties, Actual: ${JSON.stringify(cardPriceStatsRequest)}`)
// }
//
// const retrieve = async (cardPriceStatsRequest:CardPriceStatsRequest):Promise<CardPriceStatsResponse> => {
//   cardPriceStatsRequestValidator.validate(cardPriceStatsRequest);
//
//   const cardPrices:Array<HistoricalCardPriceEntity> = await retrievePrices(cardPriceStatsRequest);
//
//   const stats:CardPriceStats|null = cardPriceStatsCalculator.calculate(cardPrices);
//   const mostRecentPrice = cardPrices.length > 0
//     ? timestampToMoment(cardPrices[cardPrices.length - 1].timestamp)
//     : moment(0);
//   return {
//     request: cardPriceStatsRequest,
//     resultCount: cardPrices.length,
//     mostRecentPrice,
//     stats,
//     cardId: cardPriceStatsRequest.cardId,
//   };
// }
//
// export const cardPriceStatsRequestRetriever = {
//   retrieve,
// }