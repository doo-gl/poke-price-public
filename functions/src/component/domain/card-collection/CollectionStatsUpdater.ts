import {CardCollectionEntity, CardCollectionPriceStats, CardCollectionStatsV2} from "./CardCollectionEntity";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {legacyIdOrFallback} from "../item/ItemEntity";
import {TimestampStatic} from "../../external-lib/Firebase";
import {union} from "../../tools/SetOperations";
import {toInputValueSet} from "../../tools/SetBuilder";
import {cardCollectionRetriever} from "./CardCollectionRetriever";
import {flattenArray} from "../../tools/ArrayFlattener";
import {fromCurrencyAmountLike, Zero} from "../money/CurrencyAmount";
import {CurrencyCode} from "../money/CurrencyCodes";
import {BatchUpdate} from "../../database/BaseCrudRepository";
import {cardCollectionRepository} from "./CardCollectionRepository";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {itemPriceQuerier} from "../item/ItemPriceQuerier";
import {dedupe} from "../../tools/ArrayDeduper";
import {collectionPriceQuerier} from "./CollectionPriceQuerier";
import {ALLOWED_CURRENCY_CODES} from "../user/UserCurrencyUpdater";


interface StatUpdate extends CardCollectionStatsV2 {
  collectionId:string
  visibleItemIds:Array<string>,
  itemIds:Array<string>,
}

const calculateStats = async (collection:CardCollectionEntity, currencies:Array<CurrencyCode>):Promise<StatUpdate> => {
  const items = await cardItemRetriever.retrieveByIds(collection.cardIds);

  const currencyToPriceStats = new Map<CurrencyCode, CardCollectionPriceStats>()
  currencies.forEach(currency => {
    currencyToPriceStats.set(currency, {
      currencyCode: currency,
      totalPrice: Zero(currency).toCurrencyAmountLike(),
      visibleTotalPrice: Zero(currency).toCurrencyAmountLike(),
    })
  })

  const itemIds:Array<string> = []
  const visibleItemIds:Array<string> = []
  items.forEach(item => {
    const isVisible = item.visible && collection.visible;

    itemIds.push(legacyIdOrFallback(item))
    if (isVisible) {
      visibleItemIds.push(legacyIdOrFallback(item))
    }

    currencies.forEach(currency => {
      const priceStats = currencyToPriceStats.get(currency)
      if (!priceStats) {
        return;
      }
      const itemPrice = itemPriceQuerier.pokePrice(item, currency)
      if (!itemPrice || !itemPrice.price) {
        return;
      }

      priceStats.totalPrice = fromCurrencyAmountLike(priceStats.totalPrice)
        .add(fromCurrencyAmountLike(itemPrice.price))
        .toCurrencyAmountLike()

      if (isVisible) {
        priceStats.visibleTotalPrice = fromCurrencyAmountLike(priceStats.visibleTotalPrice)
          .add(fromCurrencyAmountLike(itemPrice.price))
          .toCurrencyAmountLike()
      }
      currencyToPriceStats.set(currency, priceStats)
    })

  })

  const prices = [...currencyToPriceStats.values()]
    .sort(comparatorBuilder.objectAttributeASC(value => value.currencyCode))

  return {
    collectionId: collection.id,
    count: itemIds.length,
    itemIds,
    visibleCount: visibleItemIds.length,
    visibleItemIds,
    lastUpdatedAt: TimestampStatic.now(),
    prices,
  }
}

const combineIds = (ids1:Array<string>, ids2:Array<string>):Array<string> => {
  const set = union(
    toInputValueSet(ids1),
    toInputValueSet(ids2)
  )
  return [...set.values()].sort()
}

const combinePriceStats = (priceStats:Array<CardCollectionPriceStats>):Array<CardCollectionPriceStats> => {
  const currencies = dedupe(priceStats.map(priceStat => priceStat.currencyCode), i => i);
  const currencyToPriceStats = new Map<CurrencyCode, CardCollectionPriceStats>()
  currencies.forEach(currency => {
    currencyToPriceStats.set(currency, {
      currencyCode: currency,
      totalPrice: Zero(currency).toCurrencyAmountLike(),
      visibleTotalPrice: Zero(currency).toCurrencyAmountLike(),
    })
  })

  priceStats.forEach(priceStat => {
    const resultStat = currencyToPriceStats.get(priceStat.currencyCode);
    if (!resultStat) {
      return;
    }
    resultStat.totalPrice = fromCurrencyAmountLike(priceStat.totalPrice)
      .add(fromCurrencyAmountLike(resultStat.totalPrice))
      .toCurrencyAmountLike()

    resultStat.visibleTotalPrice = fromCurrencyAmountLike(priceStat.visibleTotalPrice)
      .add(fromCurrencyAmountLike(resultStat.visibleTotalPrice))
      .toCurrencyAmountLike()

    currencyToPriceStats.set(resultStat.currencyCode, resultStat);
  })

  return [...currencyToPriceStats.values()]
    .sort(comparatorBuilder.objectAttributeASC(value => value.currencyCode))
}

const combineStatUpdates = (parentCollection:CardCollectionEntity, statUpdates:Array<StatUpdate>):StatUpdate => {
  let itemIds:Array<string> = []
  let visibleItemIds:Array<string> = [];
  let priceStats:Array<CardCollectionPriceStats> = []
  statUpdates.forEach(statUpdate => {
    itemIds = combineIds(itemIds, statUpdate.itemIds)
    visibleItemIds = combineIds(visibleItemIds, statUpdate.visibleItemIds)
    priceStats = combinePriceStats(priceStats.concat(statUpdate.prices))
  })
  if (!parentCollection.visible) {
    visibleItemIds = []
    priceStats = priceStats.map(priceStat => ({
      ...priceStat,
      visibleTotalPrice: Zero(priceStat.currencyCode).toCurrencyAmountLike(),
    }))
  }
  const result:StatUpdate = {
    collectionId: parentCollection.id,
    itemIds,
    count: itemIds.length,
    visibleItemIds,
    visibleCount: visibleItemIds.length,
    prices: priceStats,
    lastUpdatedAt: TimestampStatic.now(),
  }
  return result;
}

const calculateUpdates = async (
  rootCollectionId:string
):Promise<Array<StatUpdate>> => {

  const currencyCodesToCalculateFor = [...ALLOWED_CURRENCY_CODES]

  const collection = await cardCollectionRetriever.retrieve(rootCollectionId);
  const children = await cardCollectionRetriever.retrieveByParentCollectionId(rootCollectionId);
  if (!children || children.length === 0) {
    const stats = await calculateStats(collection, currencyCodesToCalculateFor);
    return [stats]
  }

  const childStats = await Promise.all(
    children.map(child => calculateUpdates(child.id))
  )
    .then(results => flattenArray(results));

  const statUpdate = combineStatUpdates(collection, childStats)
  return [statUpdate].concat(childStats);
}

const update = async (collectionId:string) => {
  const rootCollection = await cardCollectionRetriever.retrieveParent(collectionId)
  const stats = await calculateUpdates(rootCollection.id);
  const updates:Array<BatchUpdate<CardCollectionEntity>> = []
  stats.forEach(stat => {
    const defaultStats = collectionPriceQuerier.queryPriceStats(stat.prices, CurrencyCode.GBP)
    if (!defaultStats) {
      return;
    }
    updates.push({
      id: stat.collectionId,
      update: {
        cardIds: stat.itemIds,
        visibleCardIds: stat.visibleItemIds,
        stats: {
          count: stat.count,
          totalPrice: defaultStats.totalPrice,
          visibleCount: stat.visibleCount,
          visibleTotalPrice: defaultStats.visibleTotalPrice,
          lastUpdatedAt: stat.lastUpdatedAt,
        },
        statsV2: {
          visibleCount: stat.visibleCount,
          count: stat.count,
          lastUpdatedAt: stat.lastUpdatedAt,
          prices: stat.prices,
        },
      },
    })
  })
  await cardCollectionRepository.batchUpdate(updates);
}

export const collectionStatsUpdater = {
  update,
}