import {userRetriever} from "../../user/UserRetriever";
import {logger} from "firebase-functions";
import {portfolioStatsHistoryRetriever} from "../../portfolio/PortfolioStatsHistoryRetriever";
import moment from "moment";
import {PortfolioStatsHistoryEntity} from "../../portfolio/PortfolioStatsHistoryEntity";
import {toInputValueMap, toInputValueMultiMap} from "../../../tools/MapBuilder";
import {timestampToMoment} from "../../../tools/TimeConverter";
import {comparatorBuilder} from "../../../infrastructure/ComparatorBuilder";
import {PortfolioStatsEntity, SingleCollectionStats} from "../../portfolio/PortfolioStatsEntity";
import {PortfolioUpdateTemplate, PortfolioUpdateVariables} from "../Template";
import {fromCurrencyAmountLike, Zero} from "../../money/CurrencyAmount";
import {portfolioUpdateTopCollectionHtmlBuilder} from "./PortfolioUpdateTopCollectionHtmlBuilder";
import {CardCollectionEntity} from "../../card-collection/CardCollectionEntity";
import Decimal from "decimal.js-light";
import {cardCollectionRetriever} from "../../card-collection/CardCollectionRetriever";
import {templateEmailSender} from "../TemplateEmailSender";
import {EmailType, extractUserCurrencyCode, UserEntity} from "../../user/UserEntity";
import {Timestamp, TimestampStatic} from "../../../external-lib/Firebase";


const findStatsHistory = async (user:UserEntity, lastStatsUpdate:Timestamp|null):Promise<PortfolioStatsHistoryEntity|null> => {
  if (!lastStatsUpdate) {
    return null
  }
  const start = timestampToMoment(lastStatsUpdate).clone().subtract(21, 'days').startOf('day')
  const end = timestampToMoment(lastStatsUpdate).clone().subtract(7, 'days').endOf('day')
  const portfolioStatsHistory = await portfolioStatsHistoryRetriever.retrieveHistory(user, start, end)
  if (portfolioStatsHistory.length === 0) {
    return null
  }
  const dateToStats = toInputValueMultiMap(portfolioStatsHistory, i => timestampToMoment(i.timestamp).format('YYYY/MM/DD'))
  let date = end.clone()
  while (date.isAfter(start)) {
    const dateString = date.format('YYYY/MM/DD')
    const statsOnDate = dateToStats.get(dateString)
    if (statsOnDate && statsOnDate.length > 0) {
      const sortedStats = statsOnDate.slice().sort(comparatorBuilder.objectAttributeDESC(i => i.timestamp.toMillis()))
      const latestStatsOnDate = sortedStats[0]
      return latestStatsOnDate
    }
    date = date.clone().subtract(1, 'day')
  }
  return null
}

interface CollectionStatsPair {
  collectionStats:SingleCollectionStats,
  collectionStatsHistory:SingleCollectionStats|null
}

const chooseCollectionsToReportOn = (currentPortfolioStats:PortfolioStatsHistoryEntity, portfolioStatsHistory:PortfolioStatsHistoryEntity|null):Array<CollectionStatsPair> => {
  const collectionIdToCollectionStats = toInputValueMap(currentPortfolioStats.collectionStats.collectionStats, i => i.collectionId)
  const collectionIdToCollectionStatsHistory = toInputValueMap(portfolioStatsHistory?.collectionStats.collectionStats ?? [], i => i.collectionId)
  const collectionIdToCollectionStatsPair = new Map<string, CollectionStatsPair>();
  [...collectionIdToCollectionStats.entries()].forEach(entry => {
    const collectionId = entry[0]
    const collectionStats = entry[1]
    const collectionStatsHistory = collectionIdToCollectionStatsHistory.get(collectionId) ?? null
    collectionIdToCollectionStatsPair.set(collectionId, { collectionStats, collectionStatsHistory })
  })

  // by largest change in number of owned items desc
  // then by total number of owned items
  // use value then id to break ties
  const sortedCollectionPairs = [...collectionIdToCollectionStatsPair.values()].sort(
    comparatorBuilder.combineAll(
      comparatorBuilder.objectAttributeDESC(pair => {
        return pair.collectionStats.totalNumberOfOwnedItems - (pair.collectionStatsHistory?.totalNumberOfOwnedItems ?? 0)
      }),
      comparatorBuilder.objectAttributeDESC(pair => pair.collectionStats.totalNumberOfOwnedItems),
      comparatorBuilder.objectAttributeDESC(pair => pair.collectionStats.totalValueOfOwnedItems.amountInMinorUnits),
      comparatorBuilder.objectAttributeDESC(pair => pair.collectionStats.collectionId),
    )
  )

  return sortedCollectionPairs.slice(0, 3)
}

const calculateSingleTopCollectionHtml = (collection:CardCollectionEntity, collectionStats:SingleCollectionStats, collectionStatsHistory:SingleCollectionStats|null):string => {

  const itemsOwned = collectionStats.totalNumberOfOwnedItems
  const itemsInCollection = collectionStats.totalNumberOfItems
  const previousOwnedItems = collectionStatsHistory?.totalNumberOfOwnedItems ?? 0
  const itemsChange = collectionStats.totalNumberOfOwnedItems - previousOwnedItems
  const itemsPercentage = new Decimal(itemsOwned).div(itemsInCollection).mul(100).toDecimalPlaces(1)
  const itemsValue = fromCurrencyAmountLike(collectionStats.totalValueOfOwnedItems)
  const previousValue = collectionStatsHistory && collectionStatsHistory.totalValueOfOwnedItems.currencyCode === itemsValue.currencyCode
    ? fromCurrencyAmountLike(collectionStatsHistory.totalValueOfOwnedItems)
    : Zero(itemsValue.currencyCode)
  const itemsValueChange = itemsValue.subtract(previousValue)
  return portfolioUpdateTopCollectionHtmlBuilder.build({
    logoUrl: collection.imageUrl,
    itemsOwned: itemsOwned.toString(),
    itemsInCollection: itemsInCollection.toString(),
    itemsChange: `(${itemsChange >= 0 ? '+' : ''}${itemsChange} this week)`,
    itemsPercentage: `${itemsPercentage.toString()}%`,
    itemsValue: itemsValue.toString(),
    itemsValueChange: `(${itemsValueChange.isZeroOrPositive() ? '+' : ''}${itemsValueChange.toString()} this week)`,
  })
}

const calculateTopCollectionHtml = async (currentPortfolioStats:PortfolioStatsHistoryEntity, portfolioStatsHistory:PortfolioStatsHistoryEntity|null):Promise<string> => {
  const collectionsToReport = chooseCollectionsToReportOn(currentPortfolioStats, portfolioStatsHistory)
  const collections = await cardCollectionRetriever.retrieveVisibleByIds(collectionsToReport.map(pair => pair.collectionStats.collectionId))
  const collectionIdToCollection = toInputValueMap(collections, i => i.id)
  let html = ''
  collectionsToReport.forEach(pair => {
    const collection = collectionIdToCollection.get(pair.collectionStats.collectionId)
    if (!collection) {
      return
    }
    const collectionHtml = calculateSingleTopCollectionHtml(collection, pair.collectionStats, pair.collectionStatsHistory)
    html = html + collectionHtml
  })
  return html
}

const calculateEmailVariables = async (currentPortfolioStats:PortfolioStatsHistoryEntity, portfolioStatsHistory:PortfolioStatsHistoryEntity|null):Promise<PortfolioUpdateVariables> => {
  const portfolioSize = currentPortfolioStats.inventoryItemStats.totalNumberOfIndividualItems.toString()

  const portfolioSizeChange = portfolioStatsHistory
    ? currentPortfolioStats.inventoryItemStats.totalNumberOfIndividualItems - portfolioStatsHistory.inventoryItemStats.totalNumberOfIndividualItems
    : currentPortfolioStats.inventoryItemStats.totalNumberOfIndividualItems

  const portfolioValue = fromCurrencyAmountLike(currentPortfolioStats.inventoryItemStats.totalValueOfInventoryItems)
  const previousPortfolioValue = portfolioStatsHistory && portfolioStatsHistory.inventoryItemStats.totalValueOfInventoryItems.currencyCode === portfolioValue.currencyCode
    ? fromCurrencyAmountLike(portfolioStatsHistory.inventoryItemStats.totalValueOfInventoryItems)
    : Zero(portfolioValue.currencyCode)
  const portfolioValueChange = portfolioValue.subtract(previousPortfolioValue)

  const topCollectionHtml = await calculateTopCollectionHtml(currentPortfolioStats, portfolioStatsHistory)
  return {
    PORTFOLIO_SIZE: portfolioSize,
    PORTFOLIO_SIZE_CHANGE: `(${portfolioSizeChange >= 0 ? '+' : ''}${portfolioSizeChange} this week)`,
    PORTFOLIO_VALUE: portfolioValue.toString(),
    PORTFOLIO_VALUE_CHANGE: `(${portfolioValueChange.isZeroOrPositive() ? '+' : ''}${portfolioValueChange.toString()} this week)`,
    TOP_COLLECTION_HTML: topCollectionHtml,
  }
}

const send = async (userId:string):Promise<void> => {
  logger.info(`Attempting to send portfolio update email to user: ${userId}`)
  const user = await userRetriever.retrieve(userId)

  if (user.emailPreferences && user.emailPreferences.unsubscribedEmailTypes.some(type => type === EmailType.PORTFOLIO_UPDATE)) {
    logger.info(`Not sending portfolio update to user ${userId}, unsubscribed from this type of email`)
    return
  }
  const email = user.details?.email ?? null
  if (!email || !email.includes('@')) {
    logger.info(`Not sending portfolio update to user ${userId}, no email`)
    return
  }
  const portfolioStats = await portfolioStatsHistoryRetriever.retrieveMostRecentHistory(user);
  if (!portfolioStats) {
    logger.info(`Not sending portfolio update to user ${userId}, no portfolio`)
    return
  }
  if (portfolioStats.inventoryItemStats.totalNumberOfIndividualItems === 0) {
    logger.info(`Not sending portfolio update to user ${userId}, no inventory items`)
    return
  }

  const portfolioStatsHistory = await findStatsHistory(user, portfolioStats.lastUpdate)
  const variables = await calculateEmailVariables(portfolioStats, portfolioStatsHistory)
  const attempt = await templateEmailSender.send<PortfolioUpdateTemplate>(
    // `PORTFOLIO_UPDATE_${userId}_${moment().format('YYYY_MM_DD_HH_mm')}`,
    `PORTFOLIO_UPDATE_${userId}_${moment().format('YYYY_MM_DD')}`,
    userId,
    {
      name: "Portfolio Update",
      subject: "Your Portfolio Stats Update from pokeprice.io",
      variables: variables,
      metadata: {
        timestamp: TimestampStatic.now(),
        fromPortfolioStatsHistoryId: portfolioStatsHistory?.id ?? null,
        toPortfolioStatsHistoryId: portfolioStats.id,
        userId: userId,
        currencyCode: extractUserCurrencyCode(user),
      },
    }
  )
}

export const portfolioUpdateEmailSender = {
  send,
}