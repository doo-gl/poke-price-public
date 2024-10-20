import {CurrencyAmountLike} from "../../../money/CurrencyAmount";
import Root = cheerio.Root;
import {priceExtractor} from "./PriceExtractor";
import Cheerio = cheerio.Cheerio;
import {ParsingError} from "../../../../error/ParsingError";
import {priceConverter} from "./PriceConverter";
import {isCurrencyCode} from "../../../money/CurrencyCodes";

export interface PriceInfo {
  price:CurrencyAmountLike,
  buyItNowPrice:CurrencyAmountLike|null,
}

// best offer button: #boBtn_btn
// buy it now button: #binBtn_btn
// bid button: #bidBtn_btn


const findBuyItNowPrice2 = (url:string, $:Root):CurrencyAmountLike|null => {
  const matchers = [
    () => $('div.x-buybox__price-section').find('div.x-bin-price').find('div.x-price-primary').find('span.ux-textspans'),
  ]
  for (let matchIndex = 0; matchIndex < matchers.length; matchIndex++) {
    const matcher = matchers[matchIndex];
    const priceSpan = matcher();
    if (priceSpan.length > 0) {
      return priceConverter.convert(url, priceSpan.text())
    }
  }
  return null
}

const findBuyItNowPrice1 = (url:string, $:Root):CurrencyAmountLike|null => {
  const columnContainers = $('div.columncontainer')
  if (columnContainers.length === 0) {
    return null
  }
  let buyItNowPrice:CurrencyAmountLike|null = null;
  columnContainers.each(function (this:Cheerio, index, elem) {
    const item:Cheerio = $(this); // eslint-disable-line no-invalid-this

    const buyItNowButton = item.find('#binBtn_btn')
    const priceSpan = item.find('#prcIsum')
    if (buyItNowButton.length > 0 && priceSpan.length > 0 && !buyItNowPrice) {
      buyItNowPrice = priceConverter.convert(url, priceSpan.text())
    }

  })
  return buyItNowPrice
}

const findBuyItNowPrice = (url:string, $:Root):CurrencyAmountLike|null => {
  const binPrice2 = findBuyItNowPrice2(url ,$)
  if (binPrice2) {
    return binPrice2
  }
  return findBuyItNowPrice1(url, $)
}

const findPricesFromMicroData = (url:string, $:Root):Array<CurrencyAmountLike> => {
  const offers = $('[itemprop=offers]')
  const prices = new Array<CurrencyAmountLike>()

  const priceSpans = offers.find('[itemprop=price]')
  const currencySpans = offers.find('[itemprop=priceCurrency]')

  if (priceSpans.length !== currencySpans.length) {
    throw new ParsingError(`Mismatched currency and price itemprops at: ${url}`);
  }

  for (let index = 0; index < priceSpans.length; index++) {
    const priceSpan = priceSpans.eq(index)
    const currencySpan = currencySpans.eq(index)

    const amountInMinorUnits:any = (Number.parseFloat(priceSpan.attr("content") ?? "")) * 100
    const currencyCode:any = currencySpan.attr("content")
    if (amountInMinorUnits === Number.NaN) {
      throw new ParsingError(`Failed to parse price ${index} at: ${url}, Amount: ${priceSpan.attr("content") }, is NaN`)
    }
    if (!isCurrencyCode(currencyCode)) {
      throw new ParsingError(`Failed to parse price ${index} at: ${url}, Currency Code: ${currencyCode}, is not a currency`)
    }
    prices.push({amountInMinorUnits, currencyCode})
  }

  return prices
}

const findPricesFromMicroDataV2 = (url:string, $:Root):Array<CurrencyAmountLike> => {
  // the V2 of this is needed because the micro data does not accuratelty reflect the currency
  // it says USD when it is actually CAD for example
  // so this hybrid uses microdata initially but can be replaced with v1 once they become consistent

  const offers = $('[itemprop=offers]')
  const prices = new Array<CurrencyAmountLike>()

  const priceSpans = offers.find('[itemprop=price]').find('.ux-textspans')


  for (let index = 0; index < priceSpans.length; index++) {
    const priceSpan = priceSpans.eq(index)
    const price = priceConverter.convert(url, priceSpan.text())
    prices.push(price)
  }

  return prices
}

const extractPriceInfo = (url:string, $:Root):PriceInfo|null => {
  const offers = $('[itemprop=offers]')

  const bidPriceTag = offers.find(".x-bid-price").find("[itemprop=price]").find(".ux-textspans")
  const buyItNowPriceTag = offers.find(".x-bin-price").find("[itemprop=price]").find(".ux-textspans")

  const bidPrice = bidPriceTag.length > 0
    ? priceConverter.convert(url, bidPriceTag.text())
    : null;
  const buyItNowPrice = buyItNowPriceTag.length > 0
    ? priceConverter.convert(url, buyItNowPriceTag.text())
    : null;

  const price = bidPrice ? bidPrice : buyItNowPrice
  if (!price) {
    return null
  }
  return {
    price,
    buyItNowPrice,
  }
}

const extract = (url:string, $:Root):PriceInfo => {

  const priceInfo = extractPriceInfo(url, $)
  if (priceInfo) {
    return priceInfo
  }

  const price = priceExtractor.extract(url, $)
  const buyItNowPrice = findBuyItNowPrice(url, $)
  return {
    price,
    buyItNowPrice,
  }
}

export const priceExtractorV2 = {
  extract,
}