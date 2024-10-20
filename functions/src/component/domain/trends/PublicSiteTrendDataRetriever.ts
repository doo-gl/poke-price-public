import {SingleItemTrendDetails, SiteTrendData, TrendStatType} from "./SiteTrendCalculator";
import {siteTrendDataRetriever} from "./SiteTrendDataRetriever";
import {UnexpectedError} from "../../error/UnexpectedError";

export interface PublicSingleItemTrendDetails {
  key:string,
  itemIds:Array<string>

  timeFrameDays:number,
  statType:TrendStatType,

  filters: {
    tags:Array<string>|null
  },
  lastCalculated:Date,
}

export interface PublicSiteTrendData {
  lastCalculated:Date,
  itemTrends:Array<PublicSingleItemTrendDetails>,
}

const mapItemTrendData = (trendData:SingleItemTrendDetails):PublicSingleItemTrendDetails => {
  return {
    key: trendData.key,
    itemIds: trendData.itemIds,
    lastCalculated: trendData.lastCalculated,
    timeFrameDays: trendData.timeFrameDays,
    statType: trendData.statType,
    filters: trendData.filters,
  }
}

const mapTrendData = (trendData:SiteTrendData):PublicSiteTrendData => {
  return {
    lastCalculated: trendData.lastCalculated,
    itemTrends: trendData.itemTrends.map(mapItemTrendData),
  }
}

const retrieve = async ():Promise<PublicSiteTrendData> => {
  const trendData = await siteTrendDataRetriever.retrieveMostRecent()
  if (!trendData) {
    throw new UnexpectedError(`Failed to find any trend data`)
  }
  return mapTrendData(trendData.data)
}

export const publicSiteTrendDataRetriever = {
  retrieve,
}