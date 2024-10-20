import {CurrencyCode} from "../domain/money/CurrencyCodes";
import moment, {Moment} from "moment";
import {baseExternalClient, maskedQueryParams} from "./BaseExternalClient";
import {configRetriever} from "../infrastructure/ConfigRetriever";
import {UnexpectedError} from "../error/UnexpectedError";
import {exchangeRateRetriever} from "../domain/money/ExchangeRateRetriever";
import {ExchangeRateEntity} from "../domain/money/ExchangeRateEntity";
import {Create} from "../database/Entity";
import {momentToTimestamp} from "../tools/TimeConverter";
import {exchangeRateCreator} from "../domain/money/ExchangeRateRepository";
import {logger} from "firebase-functions";
import {isProduction} from "../infrastructure/ProductionDecider";
import {dedupeInOrder} from "../tools/ArrayDeduper";
import {toSet} from "../tools/SetBuilder";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";
import {comparatorBuilder} from "../infrastructure/ComparatorBuilder";

const EXCHANGE_RATE_DATE_FORMAT = 'YYYY-MM-DD';
export interface ExchangeRate {
  rate:number,
  to:CurrencyCode,
  base:CurrencyCode,
  date:Moment,
}

interface ExchangeRateResponse {
  rates:{[currencyCode:string]: number},
  base:CurrencyCode,
  date:string,
  success:boolean,
  error: {
    code:number,
    info:string,
  }
}

// actually paying fixer.io but i guess they have moulded together
const API_ROOT = 'http://api.exchangeratesapi.io/v1';

const buildKey = (from:CurrencyCode, to:CurrencyCode, date:Moment):string => {
  const dateString = date.format(EXCHANGE_RATE_DATE_FORMAT);
  const key = `${from}|${to}|${dateString}`;
  return key;
}

const fromKey = (key:string):{from:CurrencyCode, to:CurrencyCode, date:Moment} => {
  const split = key.split('|')
  return {
    from: <CurrencyCode>split[0],
    to: <CurrencyCode>split[1],
    date: moment(split[2], EXCHANGE_RATE_DATE_FORMAT),
  }
}

const getRate = async (from:CurrencyCode, to:CurrencyCode, at:Moment):Promise<ExchangeRate> => {
  if (!isProduction()) {
    logger.warn(`Using local override instead of calling exchange rates API`)
    return {
      rate: 1,
      base: from,
      to,
      date: at.clone().startOf("day"),
    }
  }

  const config = configRetriever.retrieve();
  const queryParams = {
    base: `${from}`,
    symbols: `${to}`,
    access_key: `${config.currencyExchangeRateApiKey()}`,
  }
  const date = at.format(EXCHANGE_RATE_DATE_FORMAT);
  const url = `${API_ROOT}/${date}`;
  const response = await baseExternalClient.get<ExchangeRateResponse>(url, null, maskedQueryParams(queryParams));
  if (!response.success) {
    throw new UnexpectedError(`Exchange rate error: ${response.error.code} - ${response.error.info}`)
  }
  if (!response.rates[to]) {
    throw new UnexpectedError(`Exchange rate response does not contain target rate: ${to}, response: ${JSON.stringify(response)}`)
  }
  return {
    rate: response.rates[to],
    to,
    base: response.base,
    date: moment(response.date),
  }
}

const LOCAL_CACHE = new Map<string, ExchangeRateEntity>()

const getRateCached = async (from:CurrencyCode, to:CurrencyCode, at:Moment):Promise<ExchangeRateEntity> => {
  const key = buildKey(from, to, at);

  const locallyCachedRate = LOCAL_CACHE.get(key) ?? null
  if (locallyCachedRate) {
    return locallyCachedRate
  }

  const preExistingRate = await exchangeRateRetriever.retrieveByKey(key);
  if (preExistingRate) {
    LOCAL_CACHE.set(key, preExistingRate)
    return preExistingRate;
  }
  const rateFromApi = await getRate(from, to, at);

  const create:Create<ExchangeRateEntity> = {
    from,
    to,
    date: momentToTimestamp(moment(at).startOf('day')),
    key,
    rate: rateFromApi.rate,
  }
  const createdRate = await exchangeRateCreator.create(create);
  LOCAL_CACHE.set(key, createdRate)
  return createdRate;
}

const getRatesCached = async (from:CurrencyCode, to:CurrencyCode, atTimes:Array<Moment>):Promise<Array<ExchangeRateEntity>> => {
  const keys = dedupeInOrder(atTimes.map(atTime => buildKey(from, to, atTime)), i => i)

  const ratesFromLocalCache = new Array<ExchangeRateEntity>()
  const keysToPullFromDatabase = new Array<string>()
  keys.forEach(key => {
    const rateFromCache = LOCAL_CACHE.get(key)
    if (rateFromCache) {
      ratesFromLocalCache.push(rateFromCache)
    } else {
      keysToPullFromDatabase.push(key)
    }
  })

  const ratesFromDatabase = await exchangeRateRetriever.retrieveByKeys(keysToPullFromDatabase)
  const keysPulledFromDatabase = toSet(ratesFromDatabase, r => r.key)
  const keysToPullFromApi = new Array<string>()
  keysToPullFromDatabase.forEach(key => {
    if (!keysPulledFromDatabase.has(key)) {
      keysToPullFromApi.push(key)
    }
  })

  const ratesFromApi = new Array<ExchangeRateEntity>()
  const queue = new ConcurrentPromiseQueue({maxNumberOfConcurrentPromises: 5})
  await Promise.all(keysToPullFromApi.map(key => queue.addPromise(async () => {
    const input = fromKey(key)
    const rate = await getRateCached(input.from, input.to, input.date)
    ratesFromApi.push(rate)
  })))

  const allRates = ratesFromLocalCache
    .concat(ratesFromDatabase)
    .concat(ratesFromApi)

  allRates.sort(comparatorBuilder.objectAttributeASC(val => val.date.toDate().getTime()))

  return allRates
}

export const exchangeRatesApiClient = {
  getRate,
  getRateCached,
  getRatesCached,
}