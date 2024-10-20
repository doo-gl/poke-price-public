import {
  AggregateCardOwnershipStats,
  AggregateCardOwnershipStatsEntity,
  aggregateCardOwnershipStatsRepository,
  baseAggregateCardOwnershipStatsCreator,
  InventoryPercentile,
  ItemValuePercentile,
  PortfolioValuePercentile,
} from "./AggregateCardOwnershipStatsEntity";
import {CurrencyAmount, CurrencyAmountLike, fromCurrencyAmountLike, Zero} from "../../money/CurrencyAmount";
import {portfolioStatsRepository} from "../../portfolio/PortfolioStatsEntity";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {currencyExchanger} from "../../money/CurrencyExchanger";
import moment from "moment";
import {itemRepository} from "../../item/ItemEntity";
import {itemPriceQuerier} from "../../item/ItemPriceQuerier";
import {comparatorBuilder} from "../../../infrastructure/ComparatorBuilder";
import {JobCallback} from "../../../jobs/ScheduledJobCreator";
import {EventContext, logger} from "firebase-functions";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../../marketplace/item-details/SinglePokemonCardItemDetails";
import Decimal from "decimal.js-light";

interface PortfolioDetails {
  portfolioId:string,
  value:CurrencyAmountLike,
  inventoryItemCount:number
}

interface ItemDetails {
  itemId:string,
  value:CurrencyAmountLike
}

const PERCENTILE_SIZE = 1

const calculateInventoryCountPercentiles = (portfolios:Array<PortfolioDetails>): Array<InventoryPercentile> => {

  const orderedPortfolios = portfolios.slice().sort(comparatorBuilder.combineAll(
    comparatorBuilder.objectAttributeASC(val => val.inventoryItemCount),
    comparatorBuilder.objectAttributeDESC(val => val.portfolioId),
  ))
  const largestValue = orderedPortfolios.length

  const percentiles = new Array<InventoryPercentile>()
  let currentPercentile = 0

  // "Your Collection is larger than X% of users"
  // For each new portfolio, want to calculate the percentage of portfolios below this one

  let portfolioCount = 0
  orderedPortfolios.forEach(portfolio => {
    portfolioCount++
    const newPercentile = new Decimal(portfolioCount).dividedBy(largestValue).times(100)
      .toDecimalPlaces(1).toNumber()

    if (newPercentile - currentPercentile >= PERCENTILE_SIZE) {
      percentiles.push({
        percentile: newPercentile,
        inventoryItemsOwned: portfolio.inventoryItemCount,
        portfolioId: portfolio.portfolioId,
      })
      currentPercentile = newPercentile
    }

  })

  return percentiles
}
const calculatePortfolioValuePercentiles = (portfolios:Array<PortfolioDetails>):Array<PortfolioValuePercentile> => {

  const orderedPortfolios = portfolios.slice().sort(comparatorBuilder.combineAll(
    comparatorBuilder.objectAttributeASC(val => val.value.amountInMinorUnits),
    comparatorBuilder.objectAttributeDESC(val => val.portfolioId),
  ))
  const largestValue = orderedPortfolios.length

  // "Your Collection is More Valuable than X% of users"
  // For each new portfolio, want to calculate the percentage of portfolios below this one

  const percentiles = new Array<PortfolioValuePercentile>()
  let currentPercentile = 0
  let portfolioCount = 0
  orderedPortfolios.forEach(portfolio => {
    portfolioCount++
    const newPercentile = new Decimal(portfolioCount).dividedBy(largestValue).times(100)
      .toDecimalPlaces(1).toNumber()

    if (newPercentile - currentPercentile >= PERCENTILE_SIZE) {
      percentiles.push({
        percentile: newPercentile,
        portfolioValue: portfolio.value,
        portfolioId: portfolio.portfolioId,
      })
      currentPercentile = newPercentile
    }

  })

  return percentiles
}

const calculateItemValuePercentiles = (items:Array<ItemDetails>):Array<ItemValuePercentile> => {

  const orderedItems = items.slice().sort(comparatorBuilder.combineAll(
    comparatorBuilder.objectAttributeASC(val => val.value.amountInMinorUnits),
    comparatorBuilder.objectAttributeASC(val => val.itemId),
  ))
  const largestValue = orderedItems.length

  // "This item is worth more than X% of items"
  // For each new item, want to calculate the percentage of items below this one

  const percentiles = new Array<ItemValuePercentile>()
  let currentPercentile = 0
  let itemCount = 0
  orderedItems.forEach(item => {
    itemCount++
    const newPercentile = new Decimal(itemCount).dividedBy(largestValue).times(100)
      .toDecimalPlaces(1).toNumber()

    if (newPercentile - currentPercentile >= PERCENTILE_SIZE) {
      percentiles.push({
        percentile: newPercentile,
        itemValue: item.value,
        itemId: item.itemId,
      })
      currentPercentile = newPercentile
    }

  })

  return percentiles
}

const calculate = async ():Promise<AggregateCardOwnershipStats> => {
  let totalInventoryItems = 0
  let totalValueOfPortfolios:CurrencyAmount = Zero(CurrencyCode.GBP)
  let totalNumberOfUniquePortfolios = 0

  const portfolios = new Array<PortfolioDetails>()
  await portfolioStatsRepository.iterator().iterate(async portfolio => {
    const portfolioId = portfolio.id
    const portfolioValue = portfolio.inventoryItemStats.totalValueOfInventoryItems
    const portfolioSize = portfolio.inventoryItemStats.totalNumberOfIndividualItems

    if (portfolioValue.amountInMinorUnits < 1 || portfolioSize < 1) {
      return
    }

    totalNumberOfUniquePortfolios++
    totalInventoryItems+= portfolioSize
    const portfolioValueToAdd = portfolioValue.currencyCode !== CurrencyCode.GBP
      ? await currencyExchanger.exchange(portfolioValue, CurrencyCode.GBP, moment().subtract(1, "day"))
      : portfolioValue

    totalValueOfPortfolios = totalValueOfPortfolios.add(fromCurrencyAmountLike(portfolioValueToAdd))

    portfolios.push({
      portfolioId,
      value: fromCurrencyAmountLike(portfolioValueToAdd).toCurrencyAmountLike(),
      inventoryItemCount: portfolioSize,
    })
  })


  const items = new Array<ItemDetails>()
  await itemRepository.iterator().iterate(async item => {
    if (item.itemType !== SINGLE_POKEMON_CARD_ITEM_TYPE) {
      return
    }

    const itemId = item._id.toString()
    const value = itemPriceQuerier.pokePrice(item, CurrencyCode.GBP)?.price
    if (!value || value.currencyCode !== CurrencyCode.GBP) {
      return
    }
    items.push({itemId, value})
  })

  const inventoryOwnershipPercentiles = calculateInventoryCountPercentiles(portfolios)
  const portfolioValuePercentiles = calculatePortfolioValuePercentiles(portfolios)
  const itemValuePercentiles = calculateItemValuePercentiles(items)


  return {
    totalNumberOfUniquePortfolios,
    totalInventoryItems,
    totalValueOfPortfolios: totalValueOfPortfolios.toCurrencyAmountLike(),
    itemValuePercentiles,
    portfolioValuePercentiles,
    inventoryOwnershipPercentiles,
  }
}

const recalculate = async ():Promise<AggregateCardOwnershipStatsEntity> => {

  const mostRecentStats = await getMostRecent()
  const cutOff = moment().startOf("day")
  const shouldRecalculate = !mostRecentStats
    || moment(mostRecentStats.timestamp).isBefore(cutOff)
  if (mostRecentStats && !shouldRecalculate) {
    return mostRecentStats
  }

  const stats = await calculate()
  return baseAggregateCardOwnershipStatsCreator.create({
    timestamp: new Date(),
    ...stats,
  })
}

const getMostRecent = async () => {
  const mostRecentStats = await aggregateCardOwnershipStatsRepository.getMany({}, {
    sort: ["timestamp", -1],
    limit: 1,
  })
  if (mostRecentStats.length === 0) {
    return null
  }
  return mostRecentStats[0]
}

export const aggregateCardOwnershipStatsCalculator = {
  calculate,
  recalculate,
  getMostRecent,
}

export const AggregateCardOwnershipStatsCalculationJob:JobCallback = async (context:EventContext|null) => {
  logger.info('Starting Aggregate Card Ownership Stats Calculation Job')
  await aggregateCardOwnershipStatsCalculator.recalculate()
  logger.info('Finished Aggregate Card Ownership Stats Calculation Job')
  return Promise.resolve();
}