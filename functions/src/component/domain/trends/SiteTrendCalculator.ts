/*
 - Write component to collect trending data
   - Last Day / Week / Month
   - Series / Set / Pokemon / Energy Type / Item Ids / Artist
   - Most Viewed / Most added to inventory / Most searched
 */


import {TrendAnalysisStats, trendAnalysisStatsCalculator} from "./TrendAnalysisStatsCalculator";
import {itemTrendCalculator} from "./ItemTrendCalculator";
import {siteTrendDataRetriever} from "./SiteTrendDataRetriever";
import moment from "moment";
import {baseSiteTrendDataCreator, SiteTrendDataEntity} from "./SiteTrendDataEntity";
import {JobCallback} from "../../jobs/ScheduledJobCreator";
import {EventContext, logger} from "firebase-functions";
import {pokemonTcgApiSetScraper} from "../pokemon-tcg-api-v2/price-scraping/PokemonTcgApiSetScraper";

export enum TrendStatType {
  MOST_VIEWED = "MOST_VIEWED",
  MOST_OWNED = "MOST_OWNED",
  MOST_SEARCHED = "MOST_SEARCHED",
}

export interface SingleItemTrendDetails {
  key:string,
  itemIds:Array<string>
  // link:string|null,

  timeFrameDays:number,
  statType:TrendStatType,
  totalCount:number,
  itemDetails:Array<{itemId:string, count:number}>

  filters: {
    tags:Array<string>|null
  },
  lastCalculated:Date,
}

export interface SingleTagTrendDetails {
  label:string,
  key:string,
  tags:Array<string>

  timeFrameDays:number,
  statType:TrendStatType.MOST_SEARCHED,

  lastCalculated:Date,
}

export interface SingleCollectionTrendDetails {
  label:string,
  key:string,
  collectionIds:Array<string>

  timeFrameDays:number,
  statType:TrendStatType.MOST_VIEWED,

  lastCalculated:Date,
}

export interface SiteTrendData {

  itemTrends:Array<SingleItemTrendDetails>
  tagTrends:Array<SingleTagTrendDetails>
  collectionTrends:Array<SingleCollectionTrendDetails>
  lastCalculated:Date,

}

const mapStatsToTagTrends = async (stats:TrendAnalysisStats):Promise<Array<SingleTagTrendDetails>> => {
  return []
}

const mapStatsToCollectionTrends = async (stats:TrendAnalysisStats):Promise<Array<SingleCollectionTrendDetails>> => {
  return []
}

const mapStatsToTrends = async (stats:TrendAnalysisStats):Promise<SiteTrendData> => {
  return {
    lastCalculated: new Date(),
    itemTrends: await itemTrendCalculator.calculateFromAnalysisStats(stats),
    tagTrends: await mapStatsToTagTrends(stats),
    collectionTrends: await mapStatsToCollectionTrends(stats),
  }
}

const calculate = async ():Promise<SiteTrendData> => {
  const analysisStats = await trendAnalysisStatsCalculator.calculate()
  const trends = await mapStatsToTrends(analysisStats)
  return trends
}

const calculateAndPersist = async ():Promise<SiteTrendDataEntity> => {
  const mostRecentData = await siteTrendDataRetriever.retrieveMostRecent()
  if (mostRecentData && moment(mostRecentData.timestamp).isAfter(moment().startOf("day"))) {
    return mostRecentData
  }
  const data = await calculate()
  return baseSiteTrendDataCreator.create({
    timestamp: new Date(),
    data,
  })
}

export const siteTrendCalculator = {
  calculate,
  calculateAndPersist,
}

export const SiteTrendDataCalculationJob:JobCallback = async (context:EventContext|null) => {
  logger.info('Starting Site Trend Data Calculation Job')
  await siteTrendCalculator.calculateAndPersist()
  logger.info('Finished Site Trend Data Calculation Job')
  return Promise.resolve();
}