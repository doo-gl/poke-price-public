import {
  AggregateCardOwnershipStatsEntity,
  InventoryPercentile,
  ItemValuePercentile,
  PortfolioValuePercentile,
} from "./AggregateCardOwnershipStatsEntity";
import {CurrencyAmountLike} from "../../money/CurrencyAmount";
import {aggregateCardOwnershipStatsCalculator} from "./AggregateCardOwnershipStatsCalculator";
import {portfolioStatsRetriever} from "../../portfolio/PortfolioStatsRetriever";
import {PortfolioStatsEntity} from "../../portfolio/PortfolioStatsEntity";
import {currencyExchanger} from "../../money/CurrencyExchanger";
import {CurrencyCode} from "../../money/CurrencyCodes";
import moment from "moment";
import {comparatorBuilder} from "../../../infrastructure/ComparatorBuilder";
import {itemRetriever} from "../../item/ItemRetriever";
import {itemPriceQuerier} from "../../item/ItemPriceQuerier";
import {removeNulls} from "../../../tools/ArrayNullRemover";

export interface InventoryPercentileDetails {
  userInventoryCount:number,
  currentPercentile:InventoryPercentile|null,
  nextPercentile:InventoryPercentile|null,
}

export interface PortfolioValuePercentileDetails {
  portfolioValue:CurrencyAmountLike,
  currentPercentile:PortfolioValuePercentile|null,
  nextPercentile:PortfolioValuePercentile|null,
}

export interface UserPercentileDetails {
  userId:string,
  inventoryPercentiles:InventoryPercentileDetails,
  portfolioPercentiles:PortfolioValuePercentileDetails,
}

export interface SingleItemPercentileDetails {
  itemId:string,
  itemValue:CurrencyAmountLike|null,
  currentPercentile:ItemValuePercentile|null,
  nextPercentile:ItemValuePercentile|null,
}

export interface PercentileDetails {
  userPercentile:UserPercentileDetails,
  itemPercentiles:Array<SingleItemPercentileDetails>
}

const calculatePortfolioValuePercentileDetails = async (
  portfolio:PortfolioStatsEntity,
  mostRecentStats:AggregateCardOwnershipStatsEntity
):Promise<PortfolioValuePercentileDetails> => {
  const portfolioValue = portfolio.inventoryItemStats.totalValueOfInventoryItems
  const convertedPortfolioValue = await currencyExchanger.exchange(
    portfolioValue, CurrencyCode.GBP, moment().subtract(1, "day")
  )
  const sortedPercentiles = mostRecentStats.portfolioValuePercentiles.slice().sort(
    comparatorBuilder.combineAll(
      comparatorBuilder.objectAttributeASC(val => val.percentile),
      comparatorBuilder.objectAttributeASC(val => val.portfolioValue.amountInMinorUnits),
      comparatorBuilder.objectAttributeASC(val => val.portfolioId),
    )
  )
  let currentPercentile:PortfolioValuePercentile|null = null
  let nextPercentile:PortfolioValuePercentile|null = null
  for (let index = 0; index < sortedPercentiles.length; index++) {
    const percentile = sortedPercentiles[index]

    const percentileIsBelowPortfolioValue = percentile.portfolioValue.amountInMinorUnits <= convertedPortfolioValue.amountInMinorUnits
    if (percentileIsBelowPortfolioValue) {
      currentPercentile = percentile
    } else {
      nextPercentile = percentile
      break;
    }
  }
  return {
    portfolioValue: convertedPortfolioValue,
    nextPercentile,
    currentPercentile,
  }
}

const calculateInventoryPercentileDetails = async (
  portfolio:PortfolioStatsEntity,
  mostRecentStats:AggregateCardOwnershipStatsEntity
):Promise<InventoryPercentileDetails> => {
  const inventoryCount = portfolio.inventoryItemStats.totalNumberOfIndividualItems
  const sortedPercentiles = mostRecentStats.inventoryOwnershipPercentiles.slice().sort(
    comparatorBuilder.combineAll(
      comparatorBuilder.objectAttributeASC(val => val.percentile),
      comparatorBuilder.objectAttributeASC(val => val.inventoryItemsOwned),
      comparatorBuilder.objectAttributeASC(val => val.portfolioId),
    )
  )
  let currentPercentile:InventoryPercentile|null = null
  let nextPercentile:InventoryPercentile|null = null
  for (let index = 0; index < sortedPercentiles.length; index++) {
    const percentile = sortedPercentiles[index]

    const percentileIsBelowInventoryCount = percentile.inventoryItemsOwned <= inventoryCount
    if (percentileIsBelowInventoryCount) {
      currentPercentile = percentile
    } else {
      nextPercentile = percentile
      break;
    }
  }
  return {
    userInventoryCount: inventoryCount,
    nextPercentile,
    currentPercentile,
  }
}

const calculateUserPercentile = async (
  portfolio:PortfolioStatsEntity,
  mostRecentStats:AggregateCardOwnershipStatsEntity
):Promise<UserPercentileDetails> => {

  const portfolioPercentiles = await calculatePortfolioValuePercentileDetails(portfolio, mostRecentStats)
  const inventoryPercentiles = await calculateInventoryPercentileDetails(portfolio, mostRecentStats)
  return {
    userId: portfolio.userId,
    portfolioPercentiles,
    inventoryPercentiles,
  }
}

const calculateItemPercentiles = async (
  itemIds:Array<string>,
  mostRecentStats:AggregateCardOwnershipStatsEntity
):Promise<Array<SingleItemPercentileDetails>> => {
  const items = await itemRetriever.retrieveManyByIdOrLegacyId(itemIds)

  const sortedPercentiles = mostRecentStats.itemValuePercentiles.slice().sort(
    comparatorBuilder.combineAll(
      comparatorBuilder.objectAttributeASC(val => val.percentile),
      comparatorBuilder.objectAttributeASC(val => val.itemValue.amountInMinorUnits),
      comparatorBuilder.objectAttributeASC(val => val.itemId),
    )
  )

  const itemPercentiles = items.map(item => {
    const itemId = item._id.toString()
    const itemValue = itemPriceQuerier.pokePrice(item, CurrencyCode.GBP)?.price
    if (!itemValue || itemValue.currencyCode !== CurrencyCode.GBP) {
      return null
    }
    let currentPercentile:ItemValuePercentile|null = null
    let nextPercentile:ItemValuePercentile|null = null
    for (let index = 0; index < sortedPercentiles.length; index++) {
      const percentile = sortedPercentiles[index]

      const percentileIsBelowItemValue = percentile.itemValue.amountInMinorUnits <= itemValue.amountInMinorUnits
      if (percentileIsBelowItemValue) {
        currentPercentile = percentile
      } else {
        nextPercentile = percentile
        break;
      }
    }
    return {
      itemId,
      itemValue,
      currentPercentile,
      nextPercentile,
    }
  })

  return removeNulls(itemPercentiles)
}

const calculate = async (userId:string, itemIds:Array<string>):Promise<PercentileDetails|null> => {
  const mostRecentStats = await aggregateCardOwnershipStatsCalculator.getMostRecent()
  if (!mostRecentStats) {
    return null
  }

  const portfolio = await portfolioStatsRetriever.retrieveByUserId(userId)
  if (!portfolio) {
    return null
  }

  const userPercentile = await calculateUserPercentile(portfolio, mostRecentStats)
  // const itemPercentiles = await calculateItemPercentiles(itemIds, mostRecentStats)

  return {
    userPercentile,
    itemPercentiles: [],
  }
}

export const percentileDetailCalculator = {
  calculate,
}