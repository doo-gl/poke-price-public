import {CardPriceData} from "./CardPriceData";
import cheerio from "cheerio";
import moment from "moment";
import {CurrencyCode} from "../money/CurrencyCodes";
import {tcgPlayerHtmlClient} from "../../client/TcgPlayerHtmlClient";
import Cheerio = cheerio.Cheerio;
import {logger} from "firebase-functions";

const removeLeadingDollar = (rawPriceValue:string):number => {
  return Number(rawPriceValue.substring(rawPriceValue.indexOf('$') + 1));
}

const getMarketData = async (series:string, set:string): Promise<Array<CardPriceData>> => {
  const htmlPage = await tcgPlayerHtmlClient.getMarketData(series, set);
  const timestamp = moment();
  const cardPrices:Array<CardPriceData> = [];
  const $ = cheerio.load(htmlPage);
  $('tbody tr').each(function (this:Cheerio, index, elem) {
    // see https://github.com/typescript-eslint/typescript-eslint/issues/604
    const row:Cheerio = $(this); // eslint-disable-line no-invalid-this
    const name:string = row.find('.productDetail').find('a').text().trim();
    const number:string = row.find('.number').find('div').text().trim();
    const marketPrice:string = row.find('.marketPrice').find('div').text().trim();
    const medianPrice:string = row.find('.medianPrice').find('div').text().trim();

    const splitNumber:Array<string> = number.split('/');
    const setNumber:string = splitNumber[0].toLowerCase().replace(/^0+/, '');
    const setCount:number = parseInt(splitNumber[1]);
    const amountInDollars = removeLeadingDollar(marketPrice);
    const amountInCents = Math.trunc(amountInDollars * 100);

    if (Number.isNaN(amountInCents)) {
      return;
    }

    cardPrices.push({
      series,
      set,
      setNumber,
      setCount,
      name,
      price: { amountInMinorUnits: amountInCents, currencyCode: CurrencyCode.USD },
      timestamp,
    })
  })
  logger.info(`Parsed ${cardPrices.length} card prices from tcg player with series: ${series}, set: ${set}`);
  return cardPrices;
}

export const tcgPlayerHtmlMarketDataReader = {
  getMarketData,
}