import {ItemEntity} from "../item/ItemEntity";
import moment from "moment";
import {UserEventEntity, userEventRepository} from "../user/event/UserEventEntity";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";


export interface TrendAnalysisCountStats {
  id:string,
  stats:Array<{
    timeFrameDays:number,
    count:number,
  }>
}

export const ALLOWED_TIME_FRAME_DAYS = [1,7,30]
export const MAX_EVENTS = 25000

export class TrendAnalysisStats {
  private _itemOwnStats = new Map<string, TrendAnalysisCountStats>()
  private _tagSearchStats = new Map<string, TrendAnalysisCountStats>()
  private _itemViewStats = new Map<string, TrendAnalysisCountStats>()
  private _collectionViewStats = new Map<string, TrendAnalysisCountStats>()

  itemViewStats():Array<TrendAnalysisCountStats> {
    return [...this._itemViewStats.values()]
  }

  itemOwnStats():Array<TrendAnalysisCountStats> {
    return [...this._itemOwnStats.values()]
  }

  tagSearchStats():Array<TrendAnalysisCountStats> {
    return [...this._tagSearchStats.values()]
  }

  collectionViewStats():Array<TrendAnalysisCountStats> {
    return [...this._collectionViewStats.values()]
  }

  private static initCountStats(id:string):TrendAnalysisCountStats {
    return {
      id,
      stats: ALLOWED_TIME_FRAME_DAYS.map(timeFrameDays => ({timeFrameDays, count: 0})),
    }
  }

  addCount(stats:Map<string, TrendAnalysisCountStats>, id:string, timestamp:Date) {
    const countStats = stats.get(id) ?? TrendAnalysisStats.initCountStats(id)
    countStats.stats.forEach(stat => {
      const cutOff = moment().subtract(stat.timeFrameDays, "days")
      const isAfterCutOff = moment(timestamp).isAfter(cutOff)
      if (isAfterCutOff) {
        stat.count = stat.count + 1
      }
    })
    stats.set(id, countStats)
  }

  trackPageView(event:UserEventEntity) {
    if (event.eventName !== "PAGE_VIEW") {
      return
    }
    const timestamp = event.timestamp
    const details = event.eventDetails
    const page = details.page
    if (!page || typeof page !== "string" || page.length === 0) {
      return;
    }
    if (page.match(/^\/item\/[\w\d\-]+$/gim)) {
      const id = page.replace("/item/", "")
      this.addCount(this._itemViewStats, id, timestamp)
    }
    if (page.match(/^\/collection\/[\w\d\-]+$/gim)) {
      const id = page.replace("/collection/", "")
      this.addCount(this._collectionViewStats, id, timestamp)
    }
  }

  trackOwnership(event:UserEventEntity) {
    // const details = event.eventDetails
    // const timestamp = event.timestamp
    // if (event.eventName === "QUICK_CREATE_INVENTORY_ITEM") {
    //   const itemId = details.itemId
    //   if (!itemId || typeof itemId !== "string" || itemId.length === 0) {
    //     return;
    //   }
    //   this.addCount(this._itemOwnStats, itemId, timestamp)
    // }
    // if (event.eventName === "CREATE_INVENTORY_ITEM") {
    //   const itemIds = details.itemIds
    //   if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
    //     return;
    //   }
    //   itemIds.forEach(itemId => {
    //     this.addCount(this._itemOwnStats, itemId, timestamp)
    //   })
    // }
  }

  trackSearch(event:UserEventEntity) {
    if (event.eventName !== "SEARCH_TAG_SELECTED") {
      return
    }
    const timestamp = event.timestamp
    const details = event.eventDetails
    const tag = details.tag
    if (!tag || typeof tag !== "string" || tag.length === 0) {
      return;
    }
    this.addCount(this._tagSearchStats, tag, timestamp)
  }

  track(event:UserEventEntity) {
    this.trackPageView(event)
    this.trackSearch(event)
    this.trackOwnership(event)
  }
}



const calculate = async ():Promise<TrendAnalysisStats> => {
  const stats = new TrendAnalysisStats()

  const maxDaysAgo = ALLOWED_TIME_FRAME_DAYS.slice()
    .sort(comparatorBuilder.objectAttributeDESC(n => n))
    .find(() => true) ?? 1
  const cutOff = moment().subtract(maxDaysAgo, "days").startOf("day")

  let eventCount = 0;

  await userEventRepository.iterator()
    .options({sort: ["timestamp", -1]})
    .filter({
      timestamp: {$gte: cutOff.toDate()},
      eventName: {$in: [
          "PAGE_VIEW",
          // "QUICK_CREATE_INVENTORY_ITEM",
          // "CREATE_INVENTORY_ITEM",
          // "SEARCH_TAG_SELECTED"
        ]},
    })
    .iterate(async event => {
      stats.track(event)
      eventCount++
      return eventCount >= MAX_EVENTS
    })

  return stats
}

export const trendAnalysisStatsCalculator = {
  calculate,
}