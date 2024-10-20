import express from "express";
import {PromiseRouter} from "../../infrastructure/express/PromiseRouter";
import {NO_AUTHORIZATION} from "../../infrastructure/Authorization";
import {pokemonCardMarketDataReader} from "./PokemonCardMarketDataReader";
import {jsonToCsv} from "../../external-lib/JsonToCsv";
import {ResponseFormat} from "../../infrastructure/express/PromiseResponseMapper";


const getApiRoot = ():string => '/tcg-player';

const buildRoutes = ():express.Router => {

  const router = new PromiseRouter(getApiRoot());

  router.get(
    '/card/market-price/csv',
    NO_AUTHORIZATION,
    (req, res, next) => {

      return pokemonCardMarketDataReader.read()
        .then(value => {
          res.set('Content-Type', 'text/csv');
          return jsonToCsv.parse(value.cardPrices);
        });
    },
    ResponseFormat.STRING,
  )

  return router.expressRouter;
}

export const tcgPlayerRouteFactory = {
  buildRoutes,
}