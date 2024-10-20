import {CurrencyAmountLike} from "../../../money/CurrencyAmount";
import {ParsingError} from "../../../../error/ParsingError";
import {CurrencyCode} from "../../../money/CurrencyCodes";


const convert = (url:string, value:string):CurrencyAmountLike => {
  const priceString = value.trim()
    .toLowerCase()
    .replace('each', '')
    .replace('/ea', '')
    .replace(',', '')
    .replace(/\s+/gim, '')
  if (!priceString) {
    throw new ParsingError(`Found an empty price string at url: ${url}`);
  }
  if (priceString.startsWith('£')) {
    const amount = Number(priceString.slice(1));
    const amountInMinorUnits = Math.floor(amount * 100);
    return { currencyCode: CurrencyCode.GBP, amountInMinorUnits };
  }
  if (priceString.startsWith('gbp')) {
    const amount = Number(priceString.slice(3));
    const amountInMinorUnits = Math.floor(amount * 100);
    return { currencyCode: CurrencyCode.GBP, amountInMinorUnits };
  }
  if (priceString.startsWith('au$')) {
    const amount = Number(priceString.slice(3));
    const amountInMinorUnits = Math.floor(amount * 100);
    return { currencyCode: CurrencyCode.AUD, amountInMinorUnits };
  }
  if (priceString.startsWith('us$')) {
    const amount = Number(priceString.slice(3));
    const amountInMinorUnits = Math.floor(amount * 100);
    return { currencyCode: CurrencyCode.USD, amountInMinorUnits };
  }
  if (priceString.startsWith('c$')) {
    const amount = Number(priceString.slice(2));
    const amountInMinorUnits = Math.floor(amount * 100);
    return { currencyCode: CurrencyCode.CAD, amountInMinorUnits };
  }
  if (priceString.startsWith('eur')) {
    const amount = Number(priceString.slice(3));
    const amountInMinorUnits = Math.floor(amount * 100);
    return { currencyCode: CurrencyCode.EUR, amountInMinorUnits };
  }
  if (priceString.startsWith('chf')) {
    const amount = Number(priceString.slice(3));
    const amountInMinorUnits = Math.floor(amount * 100);
    return { currencyCode: CurrencyCode.CHF, amountInMinorUnits };
  }
  throw new ParsingError(`Unrecognised currency at url: ${url}, price: ${priceString}`)
}

export const priceConverter = {
  convert,
}