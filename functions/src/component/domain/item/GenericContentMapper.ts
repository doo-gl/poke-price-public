import {ItemEntity, PriceType, SingleCardItemDetails} from "./ItemEntity";
import {Content} from "../card/PublicCardDto";
import {itemPriceQuerier} from "./ItemPriceQuerier";
import {CurrencyCode} from "../money/CurrencyCodes";
import {CurrencyAmount, fromCurrencyAmountLike} from "../money/CurrencyAmount";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../marketplace/item-details/SinglePokemonCardItemDetails";

export const paragraph = (contents:Array<Content>):Content => {
  return {
    type: 'paragraph',
    children: contents,
  }
}

export const EMPTY:Content = { type: "empty", children: [] };

const itemTypeName = (item:ItemEntity):string => {
  if (item.itemType === SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return 'card'
  }
  return 'item'
}

const sold = (item:ItemEntity):Content => {
  const soldDetails = itemPriceQuerier.query(CurrencyCode.GBP, PriceType.SALE, item.itemPrices)
  const soldPrice = soldDetails?.price ?? null;
  const soldVolume = soldDetails?.volume ?? null;
  if (!soldPrice || soldPrice.amountInMinorUnits === 0) {
    return EMPTY;
  }
  const priceString = fromCurrencyAmountLike(soldPrice).toString();
  if (soldVolume) {
    return {
      type: 'text', children: [
        { type: "text", children: `Recently sold ` },
        { type: "bold", children: `${soldVolume}` },
        { type: "text", children: ` times and based on those sales is worth around ` },
        { type: "bold", children: `${priceString}` },
        { type: "text", children: `.` },
      ],
    }
  }
  return {
    type: 'text', children: [
      { type: "text", children: `Based on recent sales, this ${itemTypeName(item)} is worth around ` },
      { type: "bold", children: `${priceString}` },
      { type: "text", children: `.` },
    ],
  }
}

const open = (item:ItemEntity):Content => {
  const openVolume = itemPriceQuerier.query(CurrencyCode.GBP, PriceType.LISTING, item.itemPrices)?.volume ?? null;
  if (openVolume === null) {
    return EMPTY;
  }
  if (openVolume > 1) {
    return {
      type: 'text', children: [
        { type: "text", children: `Currently, there are ` },
        { type: "bold", children: `${openVolume}` },
        { type: "text", children: ` open listings for this ${itemTypeName(item)} on ebay.` },
      ],
    }
  }
  if (openVolume === 1) {
    return {
      type: 'text', children: [
        { type: "text", children: `Currently, there is ` },
        { type: "bold", children: `${openVolume}` },
        { type: "text", children: ` open listing for this ${itemTypeName(item)} on ebay.` },
      ],
    }
  }
  if (openVolume === 0) {
    return {
      type: 'text', children: [
        { type: "text", children: `Currently, there are ` },
        { type: "bold", children: `no open listings` },
        { type: "text", children: ` for this ${itemTypeName(item)} on ebay.` },
      ],
    }
  }
  return EMPTY;
}

const volatility = (item:ItemEntity):Content => {
  const soldDetails = itemPriceQuerier.query(CurrencyCode.GBP, PriceType.SALE, item.itemPrices)
  const soldLowPrice = soldDetails?.lowPrice ?? null;
  const soldPrice = soldDetails?.price ?? null;
  const soldHighPrice = soldDetails?.highPrice ?? null;
  if (
    !soldLowPrice || !soldPrice || !soldHighPrice
    || soldLowPrice.amountInMinorUnits === 0
    || soldHighPrice.amountInMinorUnits === 0
    || soldPrice.amountInMinorUnits === 0
    || soldLowPrice.amountInMinorUnits > soldPrice.amountInMinorUnits
    || soldHighPrice.amountInMinorUnits < soldPrice.amountInMinorUnits
  ) {
    return EMPTY;
  }
  const currencyCode = soldPrice.currencyCode;
  let lowerBound = fromCurrencyAmountLike(soldLowPrice)
  if (!lowerBound.isPositive()) {
    lowerBound = new CurrencyAmount(1, currencyCode);
  }
  const upperBound = fromCurrencyAmountLike(soldHighPrice);
  const boundSize = upperBound.subtract(lowerBound);
  const isHighlyVolatile = boundSize.greaterThanOrEqual(new CurrencyAmount(4000, currencyCode))
  const isQuiteVolatile = boundSize.greaterThanOrEqual(new CurrencyAmount(2000, currencyCode))
  const isQuiteStable = boundSize.greaterThanOrEqual(new CurrencyAmount(1000, currencyCode))
  const isStable = boundSize.greaterThanOrEqual(new CurrencyAmount(500, currencyCode))
  const boundContent:Array<Content> = [
    { type: "text", children: `This ${itemTypeName(item)} sells in the range of ` },
    { type: "bold", children: `${lowerBound.toString()}` },
    { type: "text", children: ` to ` },
    { type: "bold", children: `${upperBound.toString()}` },
  ];
  if (isHighlyVolatile) {
    return {
      type: 'text',
      children: boundContent.concat([
        { type: "text", children: `, making it ` },
        { type: "bold", children: `highly volatile` },
        { type: "text", children: `.` },
      ]),
    }
  }
  if (isQuiteVolatile) {
    return {
      type: 'text',
      children: boundContent.concat([
        { type: "text", children: `, making it ` },
        { type: "bold", children: `quite volatile` },
        { type: "text", children: `.` },
      ]),
    }
  }
  if (isQuiteStable) {
    return {
      type: 'text',
      children: boundContent.concat([
        { type: "text", children: `, making it ` },
        { type: "bold", children: `quite stable` },
        { type: "text", children: `.` },
      ]),
    }
  }
  if (isStable) {
    return {
      type: 'text',
      children: boundContent.concat([
        { type: "text", children: `, making it ` },
        { type: "bold", children: `stable` },
        { type: "text", children: `.` },
      ]),
    }
  }
  return {
    type: 'text',
    children: boundContent.concat([
      { type: "text", children: `, making it ` },
      { type: "bold", children: `very stable` },
      { type: "text", children: `.` },
    ]),
  }
}

const map = (item:ItemEntity):Content => {
  return {
    type: 'section',
    children: [
      paragraph([sold(item)]),
      paragraph([open(item)]),
      paragraph([volatility(item)]),
    ],
  }
}

export const genericContentMapper = {
  map,
  sold,
  open,
  volatility,
}