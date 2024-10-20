import {PokemonTcgPlayerPriceDetails, PokemonTcgPlayerPriceInfo} from "../../../../client/PokemonTcgApiClientV2";
import {ItemEntity, TcgPlayerPrices} from "../../../item/ItemEntity";
import {CurrencyCode} from "../../../money/CurrencyCodes";
import {CardVariant} from "../../../card/CardEntity";
import {toCard} from "../../../item/CardItem";
import {currencyExchanger} from "../../../money/CurrencyExchanger";
import moment from "moment";
import {CurrencyAmountLike} from "../../../money/CurrencyAmount";
import {removeNulls} from "../../../../tools/ArrayNullRemover";


const extractCardVariant = (item:ItemEntity):CardVariant|null => {
  const cardDetails = toCard(item)
  if (!cardDetails) {
    return null
  }
  return cardDetails.variant
}

const extractPriceUsdDetails = (item:ItemEntity, tcgPlayerScrapedPrices:PokemonTcgPlayerPriceInfo):PokemonTcgPlayerPriceDetails|null => {
  const cardVariant = extractCardVariant(item)
  if (cardVariant === CardVariant.DEFAULT) {
    return tcgPlayerScrapedPrices?.prices?.normal
      ?? tcgPlayerScrapedPrices?.prices?.holofoil
      ?? tcgPlayerScrapedPrices?.prices?.unlimitedHolofoil
      ?? null
  }
  if (cardVariant === CardVariant.REVERSE_HOLO) {
    return tcgPlayerScrapedPrices?.prices?.reverseHolofoil ?? null
  }
  if (cardVariant === CardVariant.FIRST_EDITION) {
    const prices = tcgPlayerScrapedPrices?.prices
    if (!prices) {
      return null
    }
    return prices["1stEdition"]
      ?? prices["1stEditionNormal"]
      ?? prices["1stEditionHolofoil"]
      ?? null
  }
  return null
}

const extractUsdPrices = (item:ItemEntity, details:PokemonTcgPlayerPriceInfo):TcgPlayerPrices|null => {
  const priceDetails = extractPriceUsdDetails(item, details)
  // all TcgPlayer Prices are given in USD
  const currencyCode = CurrencyCode.USD
  const lastUpdatedAt = moment(details.updatedAt, "YYYY-MM-DD").toDate()
  const toCurrency = (val:number|undefined|null):CurrencyAmountLike|null => {
    if (val === undefined || val === null) {
      return null
    }
    return {currencyCode, amountInMinorUnits: val * 100} // amount is in major units, so need to convert to minor units
  }
  return {
    currencyCode,
    currencyCodeUsed: currencyCode,
    lastUpdatedAt,
    directLow: toCurrency(priceDetails?.directLow),
    low: toCurrency(priceDetails?.low),
    mid: toCurrency(priceDetails?.mid),
    high: toCurrency(priceDetails?.high),
    market: toCurrency(priceDetails?.market),
  }
}

const mapDetailsForCurrency = async (priceInfo:PokemonTcgPlayerPriceInfo, priceDetails:TcgPlayerPrices, toCurrencyCode:CurrencyCode):Promise<TcgPlayerPrices|null> => {
  const fromCurrencyCode = priceDetails.currencyCode
  const exchangeRate = await currencyExchanger.getOptionalRate(fromCurrencyCode, toCurrencyCode, moment().subtract(1, "day"))
  if (!exchangeRate) {
    return null
  }
  return {
    currencyCode: toCurrencyCode,
    currencyCodeUsed: fromCurrencyCode,
    lastUpdatedAt: priceDetails.lastUpdatedAt,
    low: currencyExchanger.convertOptional(priceDetails.low, toCurrencyCode, exchangeRate),
    mid: currencyExchanger.convertOptional(priceDetails.mid, toCurrencyCode, exchangeRate),
    high: currencyExchanger.convertOptional(priceDetails.high, toCurrencyCode, exchangeRate),
    directLow: currencyExchanger.convertOptional(priceDetails.directLow, toCurrencyCode, exchangeRate),
    market: currencyExchanger.convertOptional(priceDetails.market, toCurrencyCode, exchangeRate),
  }
}

const map = async (
  item:ItemEntity,
  currencies:Array<CurrencyCode>,
  tcgPlayerScrapedPrices:PokemonTcgPlayerPriceInfo|null
):Promise<Array<TcgPlayerPrices>> => {
  if (!tcgPlayerScrapedPrices) {
    return []
  }

  const priceDetails = extractUsdPrices(item, tcgPlayerScrapedPrices)
  if (!priceDetails) {
    return []
  }
  const mappedPrices = await Promise.all(currencies.map(currency => mapDetailsForCurrency(
    tcgPlayerScrapedPrices,
    priceDetails,
    currency
  )))
  return removeNulls(mappedPrices)
}

export const tcgPlayerPriceMapper = {
  map,
  extractPriceUsdDetails,
  extractUsdPrices,
}