import {CurrencyAmount, CurrencyAmountLike, Zero} from "../../money/CurrencyAmount";
import moment, {Moment} from "moment";
import {userEventRetriever} from "../event/UserEventRetriever";
import {portfolioStatsRetriever} from "../../portfolio/PortfolioStatsRetriever";
import {UserEntity} from "../UserEntity";
import {paymentIntentRetriever} from "../../payment/payment-intent/PaymentIntentRetriever";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {userRetriever} from "../UserRetriever";
import {userMembershipQuerier} from "../../membership/UserMembershipQuerier";

interface EventResult {
  sessionCount:number,
  pageLoadCount:number,
  marketplaceLoadCount:number,
  portfolioLoadCount:number,
  itemDetailLoadCount:number,
  itemListLoadCount:number,
  redirects:number,
  watchesCreated:number,
}

interface PortfolioResult {
  numberOfMultiples:number,
  uniqueItems:number,
}

interface PaymentResult {
  stripeUserId:string|null,
  totalSpent:CurrencyAmountLike|null,
  successfulPayments:number,
  failedPayments:number,
}

export interface UserAnalysisResult{
  userId:string,
  isPro:boolean,
  paymentResult:PaymentResult,
  portfolioResult:PortfolioResult,
  eventResult:EventResult,
}

const analyseEvents = async (userId:string, from:Moment):Promise<EventResult> => {
  const events = await userEventRetriever.retrieveByUserIdSinceTimestamp(userId, from.toDate())
  let pageLoadCount = 0
  let marketplaceLoadCount = 0
  let portfolioLoadCount = 0
  let itemDetailLoadCount = 0
  let itemListLoadCount = 0
  let redirects = 0
  let watchesCreated = 0

  const sessionIds = new Set<string>()

  events.forEach(event => {
    sessionIds.add(event.sessionId)
    if (event.eventName === "REDIRECT_TO_EBAY") {
      redirects++
    }
    if (event.eventName === "ACTIVATE_ITEM_WATCH") {
      watchesCreated++
    }
    if (event.eventName === "PAGE_VIEW") {
      const url = event.eventDetails.url
      if (!url || Array.isArray(url)) {
        return
      }
      if (url.match(/pokeprice-webapp-dev.web.app/gim)) {
        return
      }
      pageLoadCount++
      if (url.match(/\/marketplace/gim)) {
        marketplaceLoadCount++
      }
      if (url.match(/\/portfolio/gim)) {
        portfolioLoadCount++
      }
      if (url.match(/\/item(\?|\/q\/|$)/gim)) {
        itemListLoadCount++
      } else if (url.match(/\/item\//gim)) {
        itemDetailLoadCount++
      }
    }

  })

  return {
    sessionCount: sessionIds.size,
    pageLoadCount,
    marketplaceLoadCount,
    portfolioLoadCount,
    itemDetailLoadCount,
    itemListLoadCount,
    redirects,
    watchesCreated,
  }
}

const analysePortfolio = async (userId:string):Promise<PortfolioResult> => {

  let numberOfMultiples = 0
  let uniqueItems = 0

  const portfolio = await portfolioStatsRetriever.retrieveByUserId(userId)
  if (portfolio) {
    uniqueItems = portfolio.ownedItemStats.totalNumberOfOwnedItems
    numberOfMultiples = portfolio.inventoryItemStats.totalNumberOfIndividualItems - uniqueItems
  }

  return {
    numberOfMultiples,
    uniqueItems,
  }
}

const analysePayments = async (user:UserEntity):Promise<PaymentResult> => {
  let totalSpent:CurrencyAmount|null = null
  let successfulPayments = 0
  let failedPayments = 0

  const stripeCustomerId = user.stripeDetails?.stripeId ?? null

  if (stripeCustomerId) {
    totalSpent = Zero(CurrencyCode.GBP)
    const payments = await paymentIntentRetriever.retrieveByStripeCustomerId(stripeCustomerId)
    payments.forEach(payment => {

      if (payment.status === "succeeded") {
        const amount = payment.amount
        totalSpent = totalSpent?.add(new CurrencyAmount(amount, CurrencyCode.GBP)) ?? null
        successfulPayments++
      } else if (payment.lastPaymentError) {
        failedPayments++
      }
    })
  }

  return {
    totalSpent: totalSpent?.toCurrencyAmountLike() ?? null,
    successfulPayments,
    failedPayments,
    stripeUserId: stripeCustomerId,
  }
}

const analyse = async (userId:string, numDays:number):Promise<UserAnalysisResult> => {

  const user = await userRetriever.retrieve(userId)

  const from = moment().subtract(numDays, 'days')

  const eventResult = await analyseEvents(userId, from)
  const portfolioResult = await analysePortfolio(userId)
  const paymentResult = await analysePayments(user)

  const isPro = userMembershipQuerier.isPokePriceProUser(user)

  return {
    userId,
    isPro,
    eventResult,
    paymentResult,
    portfolioResult,
  }
}

export const userAnalyser = {
  analyse,
}