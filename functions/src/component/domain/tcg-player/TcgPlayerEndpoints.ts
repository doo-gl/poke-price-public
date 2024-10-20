import {Endpoint, Method} from "../../infrastructure/express/Endpoint";
import {BASIC_AUTH} from "../../infrastructure/Authorization";
import {tcgPlayerMarketDataSourcer} from "./TcgPlayerMarketDataSourcer";
import {nonNullString, readParam} from "../../tools/QueryParamReader";
import {setRetriever} from "../set/SetRetriever";


export const GetTcgPlayerPricesForSet:Endpoint = {
  path: '',
  method: Method.GET,
  auth: BASIC_AUTH,
  requestHandler: async (req, res, next) => {
    const setId = readParam(req.query, 'setId', nonNullString());
    const set = await setRetriever.retrieve(setId);
    const stats = await tcgPlayerMarketDataSourcer.source(set.series, set.name);
    return {
      stats,
    }
  },
}