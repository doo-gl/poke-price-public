import {CurrencyAmountLike} from "./CurrencyAmount";
import {CurrencyCode} from "./CurrencyCodes";
import moment, {Moment} from "moment";
import {exchangeRatesApiClient} from "../../client/ExchangeRatesApiClient";
import {UnexpectedError} from "../../error/UnexpectedError";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";
import {removeNulls} from "../../tools/ArrayNullRemover";
import {dedupeInOrder} from "../../tools/ArrayDeduper";
import {ExchangeRateEntity} from "./ExchangeRateEntity";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {logger} from "firebase-functions";

export interface CurrencyExchanger {
  atTime:() => Moment,
  toCurrencyCode:() => CurrencyCode,
  exchange:(fromAmount:CurrencyAmountLike) => CurrencyAmountLike|null
}

export interface HistoricalCurrencyExchanger {
  atTimes:() => Array<Moment>,
  fromCurrencies:() => Array<CurrencyCode>,
  toCurrencyCode:() => CurrencyCode,
  exchange:(fromCurrencyAmount:CurrencyAmountLike, atTime:Moment) => CurrencyAmountLike|null,
}

export interface ExchangeRate {
  fromCurrency:CurrencyCode,
  toCurrency:CurrencyCode,
  atTime:Moment,
  rate:number,
}

const exchange = async (fromAmount:CurrencyAmountLike, toCurrencyCode:CurrencyCode, atTime:Moment):Promise<CurrencyAmountLike> => {
  if (fromAmount.currencyCode === toCurrencyCode) {
    return fromAmount
  }
  const rate = await getRate(
    fromAmount.currencyCode,
    toCurrencyCode,
    atTime
  )
  return convert(fromAmount, toCurrencyCode, rate);
}

const convert = (fromAmount:CurrencyAmountLike, toCurrencyCode:CurrencyCode, rate:number):CurrencyAmountLike => {
  const fromAmountInMicroUnits = fromAmount.amountInMinorUnits * 100;
  const exchangeAmountInMicroUnits = fromAmountInMicroUnits * rate;
  const exchangeAmountInMinorUnits = Math.floor(exchangeAmountInMicroUnits / 100);
  if (fromAmount.amountInMinorUnits > 0 && exchangeAmountInMinorUnits === 0) {
    // if it was worth something in the other currency, it can't be worth nothing in the new currency
    // This is a by-product of saving in minor units, should move to micro units
    return {
      currencyCode: toCurrencyCode,
      amountInMinorUnits: 1,
    }
  }
  return {
    currencyCode: toCurrencyCode,
    amountInMinorUnits: exchangeAmountInMinorUnits,
  }
}

const convertOptional = (fromAmount:CurrencyAmountLike|null, toCurrencyCode:CurrencyCode, rate:number):CurrencyAmountLike|null => {
  if (!fromAmount) {
    return null
  }
  return convert(fromAmount, toCurrencyCode, rate)
}

const getOptionalRate = async (fromCurrencyCode:CurrencyCode, toCurrencyCode:CurrencyCode, atTime:Moment):Promise<number|null> => {
  if (fromCurrencyCode === toCurrencyCode) {
    return 1
  }
  const response = await exchangeRatesApiClient.getRateCached(
    fromCurrencyCode,
    toCurrencyCode,
    atTime
  );
  const rate = response.rate;
  if (!rate) {
    return null
  }
  return rate
}

const getRate = async (fromCurrencyCode:CurrencyCode, toCurrencyCode:CurrencyCode, atTime:Moment):Promise<number> => {
  const rate = await getOptionalRate(fromCurrencyCode, toCurrencyCode, atTime)
  if (!rate) {
    throw new UnexpectedError(`Could not find rate: ${fromCurrencyCode} => ${toCurrencyCode} at: ${atTime.toDate().toISOString()} when querying exchange`);
  }
  return rate
}

const DEFAULT_EXCHANGE_CURRENCIES:Array<CurrencyCode> = [
  CurrencyCode.GBP,
  CurrencyCode.USD,
  CurrencyCode.EUR,
  CurrencyCode.CAD,
  CurrencyCode.AUD,
  CurrencyCode.CHF,
]
const getExchangeRates = async (toCurrency:CurrencyCode):Promise<Array<ExchangeRate>> => {
  const queue = new ConcurrentPromiseQueue<ExchangeRate|null>({maxNumberOfConcurrentPromises:1})
  const exchangeRates = await Promise.all(
    DEFAULT_EXCHANGE_CURRENCIES.map(fromCurrency => queue.addPromise(async () => {
      const atTime = moment().subtract(1, "day")
      const rate = await getOptionalRate(
        fromCurrency, toCurrency, atTime
      )
      if (!rate) {
        return null
      }
      const exchangeRate:ExchangeRate = {
        fromCurrency,
        toCurrency,
        atTime,
        rate,
      }
      return exchangeRate
    }))
  )
  return removeNulls(exchangeRates)
}

const buildHistoricalExchanger = async (
  fromCurrencies:Array<CurrencyCode>,
  toCurrencyCode:CurrencyCode,
  atTimes:Array<Moment>
):Promise<HistoricalCurrencyExchanger> => {

  const cutoff = moment()
  const filteredTimes = atTimes
    .map(time => time.clone().startOf('day'))
    .filter(time => time.isBefore(cutoff))

  const fromCurrencyToExchangeRates = new Map<CurrencyCode, Array<ExchangeRateEntity>>()
  const queue = new ConcurrentPromiseQueue({maxNumberOfConcurrentPromises: 1})
  await Promise.all(fromCurrencies.map(fromCurrency => queue.addPromise(async () => {
    const rates = await exchangeRatesApiClient.getRatesCached(fromCurrency, toCurrencyCode, filteredTimes)
    const sortedRates = rates.slice().sort(comparatorBuilder.combineAll(
      comparatorBuilder.objectAttributeASC(val => val.date.toDate().getTime()),
      comparatorBuilder.objectAttributeASC(val => val.id),
    ))
    fromCurrencyToExchangeRates.set(fromCurrency, sortedRates)
  })))

  const exchangeAt = (fromCurrencyAmount:CurrencyAmountLike, atTime:Moment):CurrencyAmountLike|null => {
    const fromCurrency = fromCurrencyAmount.currencyCode
    if (fromCurrency === toCurrencyCode) {
      return fromCurrencyAmount
    }
    const startOfDate = atTime.clone().startOf('day')
    const ratesForCurrency = fromCurrencyToExchangeRates.get(fromCurrency) ?? []
    const rate = ratesForCurrency.find(rt => rt.date.toDate().getTime() === startOfDate.toDate().getTime()) ?? null
    if (!rate) {
      logger.info(`Failed to find exchange rate: ${fromCurrency} => ${toCurrencyCode} at: ${startOfDate.toISOString()}`)
      return null
    }
    const convertedAmount = currencyExchanger.convert(fromCurrencyAmount, toCurrencyCode, rate.rate)
    return convertedAmount
  }

  return {
    atTimes: () => filteredTimes,
    fromCurrencies: () => fromCurrencies,
    toCurrencyCode: () => toCurrencyCode,
    exchange: exchangeAt,
  }
}

const buildExchanger = async (toCurrencyCode:CurrencyCode):Promise<CurrencyExchanger> => {
  const exchangeRates = await getExchangeRates(toCurrencyCode)
  const atTime = exchangeRates[0].atTime
  const doExchange = (fromCurrencyAmount:CurrencyAmountLike):CurrencyAmountLike|null => {
    const rate = exchangeRates.find(rt => rt.fromCurrency === fromCurrencyAmount.currencyCode && rt.toCurrency === toCurrencyCode)
    if (!rate) {
      return null
    }
    return convert(fromCurrencyAmount, toCurrencyCode, rate.rate)
  }
  return {
    atTime: () => atTime,
    toCurrencyCode: () => toCurrencyCode,
    exchange: doExchange,
  }
}

const buildExchangers = async (toCurrencyCodes:Array<CurrencyCode>):Promise<Array<CurrencyExchanger>> => {
  const uniqueCurrencyCodes = dedupeInOrder(toCurrencyCodes, i => i)
  return Promise.all(uniqueCurrencyCodes.map(toCurrencyCode => buildExchanger(toCurrencyCode)))
}


export const currencyExchanger = {
  exchange,
  convert,
  convertOptional,
  getRate,
  getOptionalRate,
  getExchangeRates,
  buildExchanger,
  buildExchangers,
  buildHistoricalExchanger,
}