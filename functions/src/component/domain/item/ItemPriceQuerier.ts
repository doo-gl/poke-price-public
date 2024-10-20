import {CurrencyCode} from "../money/CurrencyCodes";
import {ItemEntity, ItemPriceDetails, ItemPrices, PriceType} from "./ItemEntity";
import {CurrencyAmountLike} from "../money/CurrencyAmount";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {PublicCardMarketPrices, PublicPokePriceDto, PublicTcgPlayerPrices} from "./public-retrieval/ItemDtoV2";
import moment from "moment";
import {toInputValueMap, toInputValueMultiMap} from "../../tools/MapBuilder";
import {removeNulls} from "../../tools/ArrayNullRemover";
import {CurrencyExchanger, currencyExchanger, ExchangeRate} from "../money/CurrencyExchanger";
import {CardCondition} from "../historical-card-price/CardCondition";
import {conditionalPokePriceConverter} from "../stats/card-v2/ConditionalPokePriceConverter";


const largestPeriodSingleCurrency = (currencyCode:CurrencyCode, priceType:PriceType, itemPrices:ItemPrices):ItemPriceDetails|null => {
  const matchingPrices = itemPrices.prices.filter(priceDetails =>
    priceDetails.currencyCode === currencyCode && priceDetails.priceType === priceType
    && priceDetails.currenciesUsed && priceDetails.currenciesUsed.length === 1 && priceDetails.currenciesUsed.find(curr => curr === currencyCode)
  )
  if (matchingPrices.length === 0) {
    return null;
  }
  matchingPrices.sort(comparatorBuilder.objectAttributeDESC(value => value.periodSizeDays ?? -1))
  return matchingPrices[0]
}

const query = (currencyCode:CurrencyCode, priceType:PriceType, itemPrices:ItemPrices):ItemPriceDetails|null => {
  // find the prices with the smallest period that have more than 6 volume
  const matchingPrices = itemPrices.prices.filter(priceDetails =>
    priceDetails.currencyCode === currencyCode && priceDetails.priceType === priceType
  )
  if (matchingPrices.length === 0) {
    return null;
  }
  matchingPrices.sort(comparatorBuilder.objectAttributeASC(value => value.periodSizeDays ?? Number.MAX_SAFE_INTEGER))
  for (let priceIndex = 0; priceIndex < matchingPrices.length; priceIndex++) {
    const priceDetails = matchingPrices[priceIndex]
    if ((priceDetails.volume ?? 0) >= 6) {
      return priceDetails;
    }
  }
  return matchingPrices[matchingPrices.length - 1];
}

const currentItemPrice = (item:ItemEntity|null, preferredCurrency?:CurrencyCode):CurrencyAmountLike|null => {
  if (!item) {
    return null;
  }
  const details = query(preferredCurrency ?? CurrencyCode.GBP, PriceType.SALE, item.itemPrices);
  if (!details) {
    return null;
  }
  return details.price
}

const soldDetails = (item:ItemEntity|null, preferredCurrency?:CurrencyCode):ItemPriceDetails|null => {
  if (!item) {
    return null;
  }
  return query(preferredCurrency ?? CurrencyCode.GBP, PriceType.SALE, item.itemPrices)
}

const listingDetails = (item:ItemEntity|null, preferredCurrency?:CurrencyCode):ItemPriceDetails|null => {
  if (!item) {
    return null;
  }
  return query(preferredCurrency ?? CurrencyCode.GBP, PriceType.LISTING, item.itemPrices)
}

const tcgPlayerDetails = (priceDetails:Array<PublicTcgPlayerPrices>, preferredCurrency?:CurrencyCode|null):PublicTcgPlayerPrices|null => {
  const currencyToChoose = preferredCurrency ?? CurrencyCode.GBP
  const detailsInChosenCurrency = priceDetails.filter(detail => detail.currencyCode === currencyToChoose)
  detailsInChosenCurrency.sort(comparatorBuilder.combineAll(
    comparatorBuilder.objectAttributeDESC(val => moment(val.lastUpdatedAt).toDate().getTime()),
  ))
  return detailsInChosenCurrency.find(() => true) ?? null
}

const cardMarketDetails = (priceDetails:Array<PublicCardMarketPrices>, preferredCurrency?:CurrencyCode|null):PublicCardMarketPrices|null => {
  const currencyToChoose = preferredCurrency ?? CurrencyCode.GBP
  const detailsInChosenCurrency = priceDetails.filter(detail => detail.currencyCode === currencyToChoose)
  detailsInChosenCurrency.sort(comparatorBuilder.combineAll(
    comparatorBuilder.objectAttributeDESC(val => moment(val.lastUpdatedAt).toDate().getTime()),
  ))
  return detailsInChosenCurrency.find(() => true) ?? null
}

const pokePrice = (item:ItemEntity|null, preferredCurrency?:CurrencyCode|null):PublicPokePriceDto|null => {
  if (!item) {
    return null
  }
  const currencyToChoose = preferredCurrency ?? CurrencyCode.GBP
  return item.pokePrices.find(prc => prc.currencyCode === currencyToChoose) ?? null
}

const allModificationPrices = (item:ItemEntity|null):Array<ItemPriceDetails> => {
  if (!item) {
    return []
  }
  const modificationPrices = item.itemPrices.modificationPrices
  if (!modificationPrices) {
    return []
  }
  // the chosen price is going to be the price that has the longest time frame for any given modification key
  const keyToPrices = toInputValueMultiMap(
    modificationPrices.filter(price => !price.modificationKey || price.priceType !== PriceType.LISTING),
    price => price.modificationKey
  )
  const modPrices = [...keyToPrices.values()].map(prices => {
    const sortedPrices = prices.sort(comparatorBuilder.combineAll(
      comparatorBuilder.objectAttributeDESC(prc => prc.periodSizeDays ?? 0),
    comparatorBuilder.objectAttributeDESC(prc => prc.volume ?? 0),
    comparatorBuilder.objectAttributeDESC(prc => prc.median?.amountInMinorUnits ?? 0),
    ))
    const chosenPrice = sortedPrices.find(() => true) ?? null
    return chosenPrice
  })

  return removeNulls(modPrices)
}

const modificationKeyToPrices = (
  item:ItemEntity|null,
  targetCurrencyCode:CurrencyCode,
  exchanger:CurrencyExchanger,
):{[modificationKey:string]:CurrencyAmountLike} => {
  // get the sold price details for each modification key
  // iterate through each, checking to see if we have an exchange rate for it
  // if we don't need one, return price
  // if we do need one, and we have a rate, convert and return
  const modificationPriceDetails = allModificationPrices(item)
  const modificationPrices = modificationPriceDetails.map(details => {
    const price = details.median ?? null
    if (!price) {
      return null
    }
    const priceCurrency = price.currencyCode
    if (priceCurrency === targetCurrencyCode) {
      return {modificationKey: details.modificationKey, price}
    }
    const convertedPrice = exchanger.exchange(price)
    if (!convertedPrice) {
      return null
    }
    return {modificationKey: details.modificationKey, price: convertedPrice}
  })
  const modificationKeyToPrice:{[modificationKey:string]:CurrencyAmountLike} = {}
  modificationPrices.forEach(modPrice => {
    if (!modPrice || !modPrice.modificationKey) {
      return
    }
    modificationKeyToPrice[modPrice.modificationKey] = modPrice.price
  })
  return modificationKeyToPrice
}

const modificationPriceForKey = (item:ItemEntity|null, modificationKey:string|null):CurrencyAmountLike|null => {
  if (!item) {
    return null
  }
  if (!modificationKey) {
    return pokePrice(item)?.price ?? null
  }
  const allModPrices = allModificationPrices(item)
  const modificationKeyToPrice = toInputValueMap(allModPrices, val => val.modificationKey)
  const modPriceDetails = modificationKeyToPrice.get(modificationKey)
  return modPriceDetails?.price ?? null
}

const conditionalPrice = (item:ItemEntity|null, condition?:CardCondition, preferredCurrency?:CurrencyCode):CurrencyAmountLike|null => {
  if (!item) {
    return null
  }
  const nearMintPrice = pokePrice(item, preferredCurrency)?.price ?? null
  if (!condition || !nearMintPrice) {
    return nearMintPrice
  }
  return conditionalPokePriceConverter.convert(nearMintPrice, condition)
}

export const itemPriceQuerier = {
  query,
  soldDetails,
  listingDetails,
  currentItemPrice,
  largestPeriodSingleCurrency,
  pokePrice,
  cardMarketDetails,
  tcgPlayerDetails,
  allModificationPrices,
  modificationPrices: modificationKeyToPrices,
  modificationPrice: modificationPriceForKey,
  conditionalPrice,
}