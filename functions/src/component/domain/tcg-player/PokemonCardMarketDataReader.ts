import {tcgPlayerHtmlMarketDataReader} from "./TcgPlayerHtmlMarketDataReader";
import {CardPriceData} from "./CardPriceData";
import moment, {Moment} from "moment";

export interface MarketCardPriceData {
  timestamp: Moment,
  cardPrices: Array<CardPriceData>,
}

const read = async ():Promise<MarketCardPriceData> => {

  const cardPrices = await tcgPlayerHtmlMarketDataReader.getMarketData('sword-and-shield', 'vivid-voltage');

  return {
    timestamp: moment(),
    cardPrices,
  }
}


export const pokemonCardMarketDataReader = {
  read,
}