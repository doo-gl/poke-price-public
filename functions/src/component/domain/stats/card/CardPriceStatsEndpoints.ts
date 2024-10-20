// import {Endpoint, Method} from "../../../infrastructure/express/Endpoint";
// import {BASIC_AUTH, NO_AUTHORIZATION} from "../../../infrastructure/Authorization";
// import {cardPriceStatsCsvRetriever} from "./CardPriceStatsCsvRetriever";
// import {ResponseFormat} from "../../../infrastructure/express/PromiseResponseMapper";
// import {nonNullEnum, readParam} from "../../../tools/QueryParamReader";
// import {statDetailsRetriever} from "./StatDetailsRetriever";
//
// export enum CsvType {
//   POKE_PRICE = 'POKE_PRICE',
//   LONG_VIEW = 'LONG_VIEW',
//   OPEN_LISTINGS = 'OPEN_LISTINGS'
// }
//
// export const GetAllStatsCsv:Endpoint = {
//   path: '',
//   method: Method.GET,
//   auth: NO_AUTHORIZATION,
//   requestHandler: (req, res, next) => {
//     res.set('Content-Type', 'text/csv');
//     const csvType = readParam(req.query, 'type', nonNullEnum<CsvType>(CsvType))
//     return Promise.resolve(cardPriceStatsCsvRetriever.retrieve(csvType));
//   },
//   responseFormat: ResponseFormat.STRING,
// }
//
//
// export const GetDetailsPokePricesForStats:Endpoint = {
//   path: '/:id',
//   method: Method.GET,
//   auth: BASIC_AUTH,
//   requestHandler: async (req, res, next) => {
//     const cardStatsId = req.params.id;
//     return statDetailsRetriever.retrieve(cardStatsId)
//   },
// }