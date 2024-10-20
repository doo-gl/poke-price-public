import {
  CardLanguage,
  CardMarketPrices,
  ItemEntity,
  ItemPriceDetails,
  SingleCardItemDetails,
  SourcedPrices,
  TcgPlayerPrices,
} from "../ItemEntity";
import {
  ItemDtoV2,
  PublicCardItemDetails,
  PublicCardMarketPrices,
  PublicItemPriceInfo,
  PublicItemPrices,
  PublicPokePriceDto,
  PublicSourcedPrices,
  PublicTcgPlayerPrices,
} from "./ItemDtoV2";
import {removeNulls} from "../../../tools/ArrayNullRemover";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../../marketplace/item-details/SinglePokemonCardItemDetails";
import {cardRater} from "../../card/CardRater";
import {toTag} from "../../search-tag/SearchTagEntity";
import {itemContentMapper} from "../ItemContentMapper";
import {CurrencyAmountLike} from "../../money/CurrencyAmount";

const mapItemDetails = (itemType:string, itemDetails:any):any => {
  if (itemType === SINGLE_POKEMON_CARD_ITEM_TYPE) {
    const cardDetails = itemDetails as SingleCardItemDetails;
    const details:PublicCardItemDetails = {
      series: cardDetails.series,
      set: cardDetails.set,
      cardNumber: cardDetails.cardNumber,
      setNumber: cardDetails.setNumber,
      variant: cardDetails.variant,
      language: cardDetails.language ?? CardLanguage.ENGLISH,
      setId: cardDetails.setId,
      setDetails: cardDetails.setDetails,
      artist: cardDetails.artist,
      rarity: cardDetails.rarity,
      pokemon: cardDetails.pokemon,
      subTypes: cardDetails.subTypes,
    }
    return details;
  }
  return {}
}

const mapItemPrice = (itemPrice:ItemPriceDetails):PublicItemPriceInfo => {
  return {
    currencyCode: itemPrice.currencyCode,
    priceType: itemPrice.priceType,
    modificationKey: itemPrice.modificationKey ?? null,
    periodSizeDays: itemPrice.periodSizeDays,
    minPrice: itemPrice.minPrice,
    lowPrice: itemPrice.lowPrice,
    firstQuartile: itemPrice.firstQuartile ?? null,
    price: itemPrice.price,
    mean: itemPrice.mean ?? null,
    median: itemPrice.median ?? null,
    thirdQuartile: itemPrice.thirdQuartile ?? null,
    highPrice: itemPrice.highPrice,
    maxPrice: itemPrice.maxPrice,
    stdDev: itemPrice.stdDev ?? null,
    volume: itemPrice.volume,
    lastUpdatedAt: itemPrice.lastUpdatedAt,
    currenciesUsed: itemPrice.currenciesUsed,
  }
}

const checkCurrency = (amount:CurrencyAmountLike|null|undefined):CurrencyAmountLike|null => {
  if (!amount || !amount.amountInMinorUnits) {
    return null
  }
  if (amount.amountInMinorUnits === Number.NaN) {
    return null
  }
  return amount
}

const mapTcgPlayerPrices = (price:TcgPlayerPrices):PublicTcgPlayerPrices => {
  return {
    currencyCode: price.currencyCode,
    currencyCodeUsed: price.currencyCodeUsed,
    lastUpdatedAt: price.lastUpdatedAt,
    low: checkCurrency(price.low),
    mid: checkCurrency(price.mid),
    high: checkCurrency(price.high),
    directLow: checkCurrency(price.directLow),
    market: checkCurrency(price.market),
  }
}

const mapCardMarket = (price:CardMarketPrices):PublicCardMarketPrices => {
  return {
    currencyCode: price.currencyCode,
    currencyCodeUsed: price.currencyCodeUsed,
    lastUpdatedAt: price.lastUpdatedAt,
    lowPrice: checkCurrency(price.lowPrice),
    trendPrice: checkCurrency(price.trendPrice),
    averageSellPrice: checkCurrency(price.averageSellPrice),
    averageOneDay: checkCurrency(price.averageOneDay),
    averageSevenDay: checkCurrency(price.averageSevenDay),
    averageThirtyDay: checkCurrency(price.averageThirtyDay),
  }
}

const mapSourcedPrices = (sourcePrices:SourcedPrices|undefined):PublicSourcedPrices => {
  if (!sourcePrices) {
    return {cardMarketPrices: [], tcgPlayerPrices: [], priceId: null}
  }
  return {
    priceId: sourcePrices.priceId,
    tcgPlayerPrices: sourcePrices.tcgPlayerPrices.map(price => mapTcgPlayerPrices(price)),
    cardMarketPrices: sourcePrices.cardMarketPrices.map(price => mapCardMarket(price)),
  }
}

const mapItemPrices = (item:ItemEntity):PublicItemPrices => {
  return {
    prices: item.itemPrices.prices.map(itemPrice => mapItemPrice(itemPrice)),
    modificationPrices: item.itemPrices.modificationPrices?.map(itemPrice => mapItemPrice(itemPrice)) ?? [],
    sourcedPrices: mapSourcedPrices(item.itemPrices.sourcedPrices),
  }
}

const mapPokePrices = (item:ItemEntity):Array<PublicPokePriceDto> => {
  return item.pokePrices.map(price => ({
    currencyCode: price.currencyCode,
    currenciesUsed: price.currenciesUsed,
    lastUpdatedAt: price.lastUpdatedAt,
    lowPrice: price.lowPrice,
    price: price.price,
    highPrice: price.highPrice,
    priceSource: price.priceSource,
  }))
}

const map = (item:ItemEntity):ItemDtoV2|null => {
  if (!item.visible) {
    return null;
  }
  return {
    itemId: item._id.toString(),
    legacyItemId: item.legacyId,
    slug: item.slug,
    name: item.name,
    displayName: item.displayName,
    images: item.images,
    itemType: item.itemType,
    itemDetails: mapItemDetails(item.itemType, item.itemDetails),
    itemPrices: mapItemPrices(item),
    pokePrices: mapPokePrices(item),
    rating: cardRater.rate(item),
    content: itemContentMapper.map(item),
    tags: item.searchTags.filter(tag => !!tag.public).map(tag => toTag(tag)),
  }
}

const mapList = (items:Array<ItemEntity>):Array<ItemDtoV2> => {
  return removeNulls(items.map(map))
}

export const itemMapperV2 = {
  map,
  mapList,
  mapItemDetails,
}