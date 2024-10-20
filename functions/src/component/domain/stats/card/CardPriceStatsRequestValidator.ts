// import {CardPriceStatsRequest} from "./CardPriceStatsRequestRetriever";
// import {InvalidArgumentError} from "../../../error/InvalidArgumentError";
// import {PriceDataType} from "../../historical-card-price/PriceDataType";
//
//
// const validate = (cardPriceStatsRequest:CardPriceStatsRequest):void => {
//
//   const usingTimeBounds = !!cardPriceStatsRequest.from;
//   const usingLastNResults = !!cardPriceStatsRequest.lastNResults;
//   if (!usingTimeBounds && !usingLastNResults) {
//     throw new InvalidArgumentError(`Must provide either [from & to] OR [lastNResults]`);
//   }
//
//   if (!cardPriceStatsRequest.priceType) {
//     throw new InvalidArgumentError(`Must provide priceType, one of ${Object.values(PriceDataType).join(',')}`)
//   }
//
// }
//
// export const cardPriceStatsRequestValidator = {
//   validate,
// }