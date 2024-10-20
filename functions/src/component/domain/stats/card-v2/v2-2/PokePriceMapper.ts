import {
  CardMarketPrices,
  ItemPriceDetails,
  ItemPrices,
  PokePrice, PokePriceOverride,
  PriceSource,
  PriceType,
  TcgPlayerPrices,
} from "../../../item/ItemEntity";
import {CurrencyCode} from "../../../money/CurrencyCodes";
import {itemPriceQuerier} from "../../../item/ItemPriceQuerier";
import {logger} from "firebase-functions";
import {CurrencyAmountLike} from "../../../money/CurrencyAmount";

interface PriceContext {
  currencyCode:CurrencyCode,
  tcgPlayerPrices:TcgPlayerPrices|null,
  cardMarketPrices:CardMarketPrices|null,
  ebaySoldPrices:ItemPriceDetails|null,
  ebayListingPrices:ItemPriceDetails|null,
}

const buildPriceContext = (itemPrices:ItemPrices, currencyCode:CurrencyCode):PriceContext => {
  return {
    currencyCode,
    tcgPlayerPrices: itemPrices.sourcedPrices?.tcgPlayerPrices?.find(price => price.currencyCode === currencyCode) ?? null,
    cardMarketPrices: itemPrices.sourcedPrices?.cardMarketPrices?.find(price => price.currencyCode === currencyCode) ?? null,
    ebaySoldPrices: itemPriceQuerier.query(currencyCode, PriceType.SALE, itemPrices),
    ebayListingPrices: itemPriceQuerier.query(currencyCode, PriceType.LISTING, itemPrices),
  }
}

const isLowValueTcgPlayerOverride = (priceContext:PriceContext):boolean => {
  // if the there are ebay sales and the price is less than £2 and the tcg player price is less than 50p
  // we should use the tcgplayer price, because the majority of low value cards are sold on ebay for 99p
  // as this is the smallest starting price
  // this artificially inflates the price of a card worth, say 10p, to 99p
  const ebayAmount = priceContext.ebaySoldPrices?.median?.amountInMinorUnits
  const tcgPlayerAmount = priceContext.tcgPlayerPrices?.market?.amountInMinorUnits
  if (!ebayAmount || !tcgPlayerAmount) {
    return false
  }
  return ebayAmount <= 200 && tcgPlayerAmount <= 50
}

const exists = (val:number|null|undefined):number|null => {
  if (val === 0) {
    return null
  }
  return val ?? null
}

const priceExists = (val:CurrencyAmountLike|null|undefined):CurrencyAmountLike|null => {
  if (val?.amountInMinorUnits === 0) {
    return null
  }
  return val ?? null
}

const isEbayDisagreementTcgPlayerOverride = (priceContext:PriceContext):boolean => {
  // if the tcg player price is less than £5 and the ebay price is more than £15
  // we should use the tcgplayer price
  // this is usually an indicator that there are some fishy ebay listings occurring
  // so instead of showing the probably wrong price, just use tcg player
  const ebayAmount = exists(priceContext.ebaySoldPrices?.median?.amountInMinorUnits)
  const tcgPlayerAmount = exists(priceContext.tcgPlayerPrices?.market?.amountInMinorUnits)
  if (!ebayAmount || !tcgPlayerAmount) {
    return false
  }
  return ebayAmount >= 1500 && tcgPlayerAmount <= 500
}

const hasEnoughEbaySaleVolume = (priceContext:PriceContext):boolean => {
  const ebayAmount = exists(priceContext.ebaySoldPrices?.median?.amountInMinorUnits)
  const ebayVolume = exists(priceContext.ebaySoldPrices?.volume)
  if (!ebayVolume || !ebayAmount) {
    return false
  }
  return ebayVolume >= 5
}

const mapEbay = (price:ItemPriceDetails|null, currencyCode:CurrencyCode):PokePrice => {
  return {
    currencyCode,
    lowPrice: priceExists(price?.firstQuartile),
    price: priceExists(price?.median),
    highPrice: priceExists(price?.thirdQuartile),
    currenciesUsed: price?.currenciesUsed ?? null,
    priceSource: PriceSource.EBAY,
    lastUpdatedAt: price?.lastUpdatedAt ?? null,
  }
}

const hasTcgPlayerPrice = (priceContext:PriceContext):boolean => {
  return !!priceContext.tcgPlayerPrices && !!priceExists(priceContext.tcgPlayerPrices.market)
}

const mapTcgPlayer = (price:TcgPlayerPrices|null, currencyCode:CurrencyCode):PokePrice => {
  return {
    currencyCode,
    lowPrice: null,
    price: priceExists(price?.market),
    highPrice: null,
    currenciesUsed: price?.currencyCodeUsed ? [price.currencyCodeUsed] : null,
    priceSource: PriceSource.TCG_PLAYER,
    lastUpdatedAt: price?.lastUpdatedAt ?? null,
  }
}

const hasCardMarketPrice = (priceContext:PriceContext):boolean => {
  return !!priceContext.cardMarketPrices
    && !!(
      priceExists(priceContext.cardMarketPrices.averageSellPrice)
      || priceExists(priceContext.cardMarketPrices.trendPrice)
      || priceExists(priceContext.cardMarketPrices.averageSevenDay)
    )
}

const mapCardMarket = (price:CardMarketPrices|null, currencyCode:CurrencyCode):PokePrice => {
  return {
    currencyCode,
    lowPrice: null,
    price: priceExists(price?.averageSellPrice) ?? priceExists(price?.trendPrice) ?? priceExists(price?.averageSevenDay) ?? null,
    highPrice: null,
    currenciesUsed: price?.currencyCodeUsed ? [price.currencyCodeUsed] : null,
    priceSource: PriceSource.CARDMARKET,
    lastUpdatedAt: price?.lastUpdatedAt ?? null,
  }
}

const map = (itemPrices:ItemPrices, currencyCode:CurrencyCode, overrides:Array<PokePriceOverride>|undefined):PokePrice => {

  const priceContextForCurrency = buildPriceContext(itemPrices, currencyCode)

  const override = overrides?.find(ovr => ovr.currencyCode === currencyCode)
  if (override && override.priceSource) {
    logger.info(`Overriding Poke Price price source to ${override.priceSource}`)
    const overridePriceSource = override.priceSource
    switch (overridePriceSource) {
      case PriceSource.TCG_PLAYER:
        return mapTcgPlayer(priceContextForCurrency.tcgPlayerPrices, currencyCode)
      case PriceSource.CARDMARKET:
        return mapCardMarket(priceContextForCurrency.cardMarketPrices, currencyCode)
      case PriceSource.EBAY:
        return mapEbay(priceContextForCurrency.ebaySoldPrices, currencyCode)
    }
  }

  if (isLowValueTcgPlayerOverride(priceContextForCurrency)) {
    return mapTcgPlayer(priceContextForCurrency.tcgPlayerPrices, currencyCode)
  }
  if (isEbayDisagreementTcgPlayerOverride(priceContextForCurrency)) {
    return mapTcgPlayer(priceContextForCurrency.tcgPlayerPrices, currencyCode)
  }
  if (hasEnoughEbaySaleVolume(priceContextForCurrency)) {
    return mapEbay(priceContextForCurrency.ebaySoldPrices, currencyCode)
  }
  if (hasTcgPlayerPrice(priceContextForCurrency)) {
    return mapTcgPlayer(priceContextForCurrency.tcgPlayerPrices, currencyCode)
  }
  if (hasCardMarketPrice(priceContextForCurrency)) {
    return mapCardMarket(priceContextForCurrency.cardMarketPrices, currencyCode)
  }
  if (priceContextForCurrency.ebaySoldPrices) {
    return mapEbay(priceContextForCurrency.ebaySoldPrices, currencyCode)
  }
  if (priceContextForCurrency.ebayListingPrices?.price && priceContextForCurrency.ebayListingPrices.price.amountInMinorUnits < 10000 ) {
    return mapEbay(priceContextForCurrency.ebayListingPrices, currencyCode)
  }


  return {
    currencyCode,
    lowPrice: null,
    price: null,
    highPrice: null,
    priceSource: null,
    currenciesUsed: null,
    lastUpdatedAt: null,
  }
}

export const pokePriceMapper = {
  map,
}