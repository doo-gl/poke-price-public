import {userAnalyser, UserAnalysisResult} from "./UserAnalyser";
import {userRepository} from "../UserRepository";
import {MembershipPlan} from "../../membership/MembershipStatus";
import {comparatorBuilder} from "../../../infrastructure/ComparatorBuilder";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";
import {fromOptionalCurrencyAmountLike} from "../../money/CurrencyAmount";
import {jsonToCsv} from "../../../external-lib/JsonToCsv";


const analyseProUsers = async (lookbackDays:number):Promise<Array<UserAnalysisResult>> => {
  const users = await userRepository.getMany([
    {field: "membership.plans", operation: "array-contains", value: MembershipPlan.POKE_PRICE_PRO},
  ])
  const analysisResults = new Array<UserAnalysisResult>()
  const queue = new ConcurrentPromiseQueue({maxNumberOfConcurrentPromises: 10})
  await Promise.all(users.map(user => queue.addPromise(async () => {
    analysisResults.push(await userAnalyser.analyse(user.id, lookbackDays))
  })))
  analysisResults.sort(comparatorBuilder.combineAll(
    comparatorBuilder.objectAttributeDESC(result => result.paymentResult.totalSpent?.amountInMinorUnits ?? 0),
    comparatorBuilder.objectAttributeDESC(result => result.eventResult.sessionCount),
  ))
  return analysisResults
}

const analyseAllSignedUpUsers = async (lookbackDays:number):Promise<Array<UserAnalysisResult>> => {
  const users = await userRepository.getMany([
    {field: "details.email", operation: "!=", value: null},
  ])
  const analysisResults = new Array<UserAnalysisResult>()
  const queue = new ConcurrentPromiseQueue({maxNumberOfConcurrentPromises: 10})
  await Promise.all(users.map(user => queue.addPromise(async () => {
    analysisResults.push(await userAnalyser.analyse(user.id, lookbackDays))
  })))
  analysisResults.sort(comparatorBuilder.combineAll(
    comparatorBuilder.objectAttributeDESC(result => result.paymentResult.totalSpent?.amountInMinorUnits ?? 0),
    comparatorBuilder.objectAttributeDESC(result => result.eventResult.sessionCount),
  ))
  return analysisResults
}

const mapResultToCsvRow = (result:UserAnalysisResult) => {

  return {
    userId: result.userId,
    amountSpent: fromOptionalCurrencyAmountLike(result.paymentResult.totalSpent)?.toString(),
    isPro: result.isPro,
    isActive: result.eventResult.sessionCount > 10,
    usesMarketplace: result.eventResult.marketplaceLoadCount > 10,
    checkPrices: result.eventResult.itemListLoadCount + result.eventResult.itemDetailLoadCount > 20,
    usesWatches: result.eventResult.watchesCreated > 5,
    checkPortfolio: result.eventResult.portfolioLoadCount > 5,
    hasMultiples: result.portfolioResult.numberOfMultiples > 50,
    successfulPayments: result.paymentResult.successfulPayments,
    failedPayments: result.paymentResult.failedPayments,
    stripeUserId: result.paymentResult.stripeUserId,
    ...result.eventResult,
    ...result.portfolioResult,
  }
}

const signUpUserCsv = async (lookbackDays:number):Promise<string> => {
  const results = await analyseAllSignedUpUsers(lookbackDays)
  const rows = results.map(mapResultToCsvRow)
  return jsonToCsv.parse(rows)
}

const proUserCsv = async (lookbackDays:number):Promise<string> => {
  const results = await analyseProUsers(lookbackDays)
  const rows = results.map(mapResultToCsvRow)
  return jsonToCsv.parse(rows)
}

export const userAnalysisCsvCreator = {
  signUpUserCsv,
  proUserCsv,
}