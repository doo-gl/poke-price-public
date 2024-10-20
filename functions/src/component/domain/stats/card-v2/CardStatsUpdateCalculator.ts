import {Price, StatsPrices} from "./StatsPriceRetriever";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {Stats} from "./CardStatsEntityV2";
import {Moment} from "moment";
import moment from "moment/moment";
import {CurrencyAmountLike} from "../../money/CurrencyAmount";
import {statsCalculator} from "./StatsCalculator";
import {comparatorBuilder} from "../../../infrastructure/ComparatorBuilder";
import {RAW_MODIFICATION_KEY} from "../../modification/ItemModification";
import {logger} from "firebase-functions";

export interface ModificationStats {
  stats:Stats,
  from:Moment,
  to:Moment,
  priceIds:Array<string>
  modificationKey:string,
}

export interface CardStatsUpdateInfo {
  rawItemStats:ModificationStats,
  modificationKeys:Array<string>
  modificationStats:Array<ModificationStats>
}

interface UpdateInfo {
  priceIds:Array<string>,
  from:Moment,
  to:Moment,
  prices:Array<CurrencyAmountLike>,
}

const calculateUpdateInfo = (itemPrices:Array<Price>):UpdateInfo => {
  const priceIds:Array<string> = [];
  let from:Moment = moment();
  let to:Moment = moment();
  const prices:Array<CurrencyAmountLike> = [];

  itemPrices.forEach((itemPrice:Price, index:number) => {
    const isFirst = index === 0;
    const isLast = index === itemPrices.length - 1;
    if (isFirst) {
      from = itemPrice.timestamp;
    }
    if (isLast) {
      to = itemPrice.timestamp;
    }
    priceIds.push(itemPrice.id);
    prices.push(itemPrice.price);
  })

  return {
    priceIds,
    from,
    to,
    prices,
  }
}

const calculateModificationStats = (modificationKey:string, currencyCode:CurrencyCode, prices:Array<Price>):ModificationStats => {
  const updateInfo = calculateUpdateInfo(prices)
  const stats = statsCalculator.calculate(currencyCode, updateInfo.prices)
  return {
    modificationKey,
    stats,
    from: updateInfo.from,
    to: updateInfo.to,
    priceIds: updateInfo.priceIds,
  }
}

const calculate = (statsPrices:StatsPrices, currencyCode:CurrencyCode):CardStatsUpdateInfo => {
  const allPrices = statsPrices.prices
  const unmodifiedPrices = new Array<Price>()
  const modificationKeyToPrices = new Map<string, Array<Price>>()

  allPrices.forEach(price => {
    const modificationKey = price.itemModification?.key ?? null
    if (price.price.currencyCode !== currencyCode) {
      logger.error(`Trying to calculate for price: ${price.id}, it has currency: ${price.price.currencyCode}, expected: ${currencyCode}, from selections: ${price.selectionIds.join(',')}`)
      return
    }
    if (!modificationKey) {
      unmodifiedPrices.push(price)
    } else {
      const pricesForKey = modificationKeyToPrices.get(modificationKey) ?? []
      pricesForKey.push(price)
      modificationKeyToPrices.set(modificationKey, pricesForKey)
    }
  })

  const rawItemStats = calculateModificationStats(RAW_MODIFICATION_KEY, currencyCode, unmodifiedPrices)
  const modificationStats = new Array<ModificationStats>()
  modificationKeyToPrices.forEach((prices, modificationKey) => {
    modificationStats.push(calculateModificationStats(modificationKey, currencyCode, prices))
  })
  modificationStats.sort(comparatorBuilder.objectAttributeASC(value => value.modificationKey))
  const modificationKeys = modificationStats.map(val => val.modificationKey)
  return {
    rawItemStats,
    modificationStats,
    modificationKeys,
  }
}

export const cardStatsUpdateCalculator = {
  calculate,
}