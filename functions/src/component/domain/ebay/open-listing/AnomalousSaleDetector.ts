import {HistoricalCardPriceEntity} from "../../historical-card-price/HistoricalCardPriceEntity";
import {ItemEntity, ItemPriceDetails, PriceType} from "../../item/ItemEntity";
import {CurrencyAmountLike, fromCurrencyAmountLike} from "../../money/CurrencyAmount";
import {itemPriceQuerier} from "../../item/ItemPriceQuerier";
import {PriceDataType} from "../../historical-card-price/PriceDataType";
import {conditionalPokePriceConverter} from "../../stats/card-v2/ConditionalPokePriceConverter";
import {CardCondition} from "../../historical-card-price/CardCondition";


export interface AnomalousSale {
  itemPriceDetails:ItemPriceDetails,
  salePrice:CurrencyAmountLike,
  profit:CurrencyAmountLike,
  score:number,
  isAnomalousCheap?:boolean,
  isAnomalousExpensive?:boolean,
}

const detectForDetails = (salePrice:CurrencyAmountLike, condition:CardCondition, itemPriceDetails:ItemPriceDetails):AnomalousSale|null => {
  const itemPrice = itemPriceDetails && itemPriceDetails.price
    ? fromCurrencyAmountLike(conditionalPokePriceConverter.convert(itemPriceDetails.price, condition))
    : null;
  if (!itemPrice || itemPriceDetails.priceType !== PriceType.SALE || salePrice.currencyCode !== itemPriceDetails.currencyCode) {
    return null;
  }
  const profit = itemPrice.subtract(fromCurrencyAmountLike(salePrice))
  // something between in -1 and 1
  // 1 = massively good deal
  // -1 = massively poor deal
  const score = profit.isPositive()
    ? (1 - (salePrice.amountInMinorUnits / itemPrice.amountInMinorUnits))
    : -(1 - (itemPrice.amountInMinorUnits / salePrice.amountInMinorUnits))
  return {
    itemPriceDetails,
    salePrice: salePrice,
    profit: profit.toCurrencyAmountLike(),
    score,
    isAnomalousCheap: profit.amountInMinorUnits >= 1000 && score >= 0.5 && (itemPriceDetails?.volume ?? 0) >= 10 && !!itemPriceDetails.statIds && itemPriceDetails.statIds?.length <= 2,
    isAnomalousExpensive: profit.amountInMinorUnits <= -1000 && score <= -0.5 && (itemPriceDetails?.volume ?? 0) >= 10 && !!itemPriceDetails.statIds && itemPriceDetails.statIds?.length <= 2,
  }
}

const detect = (sale:HistoricalCardPriceEntity, item:ItemEntity):AnomalousSale|null => {

  const salePrice = fromCurrencyAmountLike(sale.currencyAmount)
  const itemPriceDetails = itemPriceQuerier.soldDetails(item)
  if (!itemPriceDetails || sale.priceDataType !== PriceDataType.SOLD_PRICE || salePrice.currencyCode !== itemPriceDetails.currencyCode) {
    return null;
  }
  return detectForDetails(sale.currencyAmount, sale.condition, itemPriceDetails)
}

export const anomalousSaleDetector = {
  detect,
  detectForDetails,
}