import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {ADMIN_AUTH} from "../../infrastructure/Authorization";
import compression from "compression";
import {cardSearchParamCsvRetriever} from "../csv/CardSearchParamCsvRetriever";
import {ResponseFormat} from "../../infrastructure/express/PromiseResponseMapper";
import {topBuyingOpportunityCsvRetriever} from "../csv/TopBuyingOpportunityCsvRetriever";
import {listingsEndingSoonCsvRetriever} from "../ebay/open-listing/ListingsEndingSoonCsvRetriever";


export const AdminGetCardSearchParamCsv:Endpoint = {
  path: '/card/search-param/csv',
  method: Method.GET,
  auth: ADMIN_AUTH,
  preMiddleware: [compression()],
  requestHandler: async (req, res, next) => {
    const result = await cardSearchParamCsvRetriever.retrieve();
    res.header('Content-Type', 'text/csv');
    return Promise.resolve(result);
  },
  responseFormat: ResponseFormat.STRING,
};


export const AdminGetTopBuyingOpportunitiesCsv:Endpoint = {
  path: '/open-listing/top-buying-opportunity/csv',
  method: Method.GET,
  auth: ADMIN_AUTH,
  preMiddleware: [compression()],
  requestHandler: async (req, res, next) => {
    const result = await topBuyingOpportunityCsvRetriever.retrieve();
    res.header('Content-Type', 'text/csv');
    return Promise.resolve(result);
  },
  responseFormat: ResponseFormat.STRING,
};


export const AdminGetListingsEndingSoonCsv:Endpoint = {
  path: '/open-listing/ending-soon/csv',
  method: Method.GET,
  auth: ADMIN_AUTH,
  preMiddleware: [compression()],
  requestHandler: async (req, res, next) => {
    const result = await listingsEndingSoonCsvRetriever.retrieve();
    res.header('Content-Type', 'text/csv');
    return Promise.resolve(result);
  },
  responseFormat: ResponseFormat.STRING,
};