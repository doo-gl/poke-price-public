import {TrendAnalysisCountStats, TrendAnalysisStats} from "./TrendAnalysisStatsCalculator";
import {
  CARD_ARTIST_SEARCH_TAG_KEY,
  CARD_ENERGY_TYPE_SEARCH_TAG_KEY, CARD_RARITY_SEARCH_TAG_KEY,
  CARD_SERIES_SEARCH_TAG_KEY,
  CARD_SET_SEARCH_TAG_KEY,
  POKEMON_SEARCH_TAG_KEY,
} from "../item/tag/PokemonCardTagExtractor";
import {toTag} from "../search-tag/SearchTagEntity";
import {SingleItemTrendDetails, TrendStatType} from "./SiteTrendCalculator";
import {itemRetriever} from "../item/ItemRetriever";
import {dedupe} from "../../tools/ArrayDeduper";
import {toInputValueMap, toInputValueMultiMap} from "../../tools/MapBuilder";
import {flattenArray} from "../../tools/ArrayFlattener";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {ItemEntity} from "../item/ItemEntity";

export interface TrendItemCount {
  item:ItemEntity,
  timeFrameDays:number,
  count:number,
}

const MAX_ITEMS_PER_TREND = 20

const mapItemStatsToItemCounts = async (stats:TrendAnalysisStats):Promise<{itemViewCounts:Array<TrendItemCount>, itemOwnCounts:Array<TrendItemCount>}> => {
  const itemViewStats = stats.itemViewStats()
  const itemOwnStats = stats.itemOwnStats()

  const itemOwnItems = await itemRetriever.retrieveManyByIdOrLegacyId(itemOwnStats.map(stat => stat.id))
  const itemViewItems = await itemRetriever.retrieveManyByIdOrLegacyIdOrSlug(itemViewStats.map(stat => stat.id))

  const items = dedupe(itemOwnItems.concat(itemViewItems), it => it._id.toString())
  const itemIdToItem = toInputValueMap(items, it => it._id.toString())
  const slugToItem = toInputValueMap(items, it => it.slug ?? "")

  const mapStat = (stat:TrendAnalysisCountStats):Array<TrendItemCount> => {
    const itemIdOrSlug = stat.id
    const item = itemIdToItem.get(itemIdOrSlug) ?? slugToItem.get(itemIdOrSlug) ?? null
    if (!item) {
      return []
    }
    return stat.stats.map(value => {
      const timeFrameDays = value.timeFrameDays
      const count = value.count
      return {
        item,
        timeFrameDays,
        count,
      }
    })
  }

  const itemViewCounts: Array<TrendItemCount> = flattenArray(itemViewStats.map(mapStat))
  const itemOwnCounts: Array<TrendItemCount> = flattenArray(itemOwnStats.map(mapStat))

  return { itemViewCounts, itemOwnCounts }
}

const NO_TAG = "NO_TAG"
const toKeys = (count:TrendItemCount, tagKey:string|null):Array<string> => {
  if (!tagKey) {
    return [`${NO_TAG}__${count.timeFrameDays}`]
  }
  return count.item.tags
    .filter(tag => tag.startsWith(`${tagKey}|`))
    .map(tag => `${tag}__${count.timeFrameDays}`)
}

const fromKey = (key:string):{tag:string, timeFrameDays:number}|null => {
  const split = key.split("__")
  const tag = split[0]
  const timeFrameDays = Number.parseInt(split[1])
  if (!timeFrameDays || timeFrameDays === Number.NaN) {
    return null
  }
  return {
    tag,
    timeFrameDays,
  }
}

const calculateItemTrends = (itemCounts:Array<TrendItemCount>, tagKey:string|null, limit:number):Array<SingleItemTrendDetails> => {

  // group the item counts by tag and timeframe
  const keyToCounts = new Map<string, {tag:string, timeFrameDays:number, totalCount:number, counts:Array<TrendItemCount>}>()
  itemCounts.forEach(count => {
    const keys = toKeys(count, tagKey)
    keys.forEach(key => {
      const parsedKey = fromKey(key)
      if (!parsedKey) {
        return
      }
      const {
        tag,
        timeFrameDays,
      } = parsedKey
      const taggedCounts = keyToCounts.get(key) ?? {tag, timeFrameDays, totalCount: 0, counts: []}
      taggedCounts.totalCount = taggedCounts.totalCount + count.count
      taggedCounts.counts.push(count)
      keyToCounts.set(key, taggedCounts)
    })
  })

  // go through each of the groups and truncate them to be the top N items in each group
  // these will be the items that are shown in the trend so they are the ones for which the count is used
  const itemCountGroups = [...keyToCounts.values()]
  const truncatedItemCountGroups = itemCountGroups.map(itemCountGroup => {
    const sortedCounts = itemCountGroup.counts.sort(comparatorBuilder.combineAll(
      comparatorBuilder.objectAttributeDESC(co => co.count),
      comparatorBuilder.objectAttributeDESC(co => co.item._id.toString())
    ))
    const truncatedCounts = sortedCounts.slice(0, MAX_ITEMS_PER_TREND)
    const newTotalCount = truncatedCounts.map(co => co.count).reduce((l, r) => l + r, 0)
    return {
      tag: itemCountGroup.tag,
      timeFrameDays: itemCountGroup.timeFrameDays,
      counts: truncatedCounts,
      totalCount: newTotalCount,
    }
  })

  // group by timeframe
  // for each timeframe, find the most popular groups
  // return the M most popular groups, these are the trends
  const timeFrameDaysToCounts = toInputValueMultiMap(truncatedItemCountGroups, co => co.timeFrameDays)
  const trends = flattenArray([...timeFrameDaysToCounts.entries()].map((entry) => {
    const timeFrameDays = entry[0]
    const countsGroupedByTimeFrame = entry[1]
    const sortedGroups = countsGroupedByTimeFrame.slice()
      .sort(comparatorBuilder.combineAll(
        comparatorBuilder.objectAttributeDESC(grp => grp.totalCount),
        comparatorBuilder.objectAttributeASC(grp => grp.tag)
      ))
    const groupsToMap = sortedGroups.slice(0, limit)
    return groupsToMap.map<SingleItemTrendDetails>(group => {
      return {
        lastCalculated: new Date(),
        timeFrameDays,
        statType: TrendStatType.MOST_VIEWED,
        totalCount: group.totalCount,
        filters: {tags: group.tag === NO_TAG ? null : [group.tag]},
        itemIds: group.counts.map(itemCount => itemCount.item._id.toString()),
        itemDetails: group.counts.map(itemCount => ({itemId: itemCount.item._id.toString(), count: itemCount.count})),
        key: `${TrendStatType.MOST_VIEWED}__LAST_${timeFrameDays}_DAYS__${group.tag}`,
      }
    })
  }))

  return trends
}

const calculateFromAnalysisStats = async (stats:TrendAnalysisStats):Promise<Array<SingleItemTrendDetails>> => {
  const itemCountData = await mapItemStatsToItemCounts(stats)
  const itemViewCounts = itemCountData.itemViewCounts
  const itemOwnCounts = itemCountData.itemOwnCounts

  const topCardTrends = calculateItemTrends(itemViewCounts, null, 1)
  const topSetTrends = calculateItemTrends(itemViewCounts, CARD_SET_SEARCH_TAG_KEY, 3)
  const topSeriesTrends = calculateItemTrends(itemViewCounts, CARD_SERIES_SEARCH_TAG_KEY, 1)
  const topPokemonTrends = calculateItemTrends(itemViewCounts, POKEMON_SEARCH_TAG_KEY, 3)
  const topEnergyTypeTrends = calculateItemTrends(itemViewCounts, CARD_ENERGY_TYPE_SEARCH_TAG_KEY, 1)
  const topArtistTrends = calculateItemTrends(itemViewCounts, CARD_ARTIST_SEARCH_TAG_KEY, 1)

  const ignoredRarities = new Set<string>([
    toTag({key: CARD_RARITY_SEARCH_TAG_KEY, value: "uncommon", keyLabel: null, valueLabel: null}),
    toTag({key: CARD_RARITY_SEARCH_TAG_KEY, value: "common", keyLabel: null, valueLabel: null}),
    toTag({key: CARD_RARITY_SEARCH_TAG_KEY, value: "rare", keyLabel: null, valueLabel: null}),
  ])
  const topRarityTrends = calculateItemTrends(
    itemViewCounts.filter(itemCount => !itemCount.item.tags.some(tag => ignoredRarities.has(tag))),
    CARD_RARITY_SEARCH_TAG_KEY,
    1
  )

  const itemViewTrends = topCardTrends
    .concat(topSetTrends)
    .concat(topSeriesTrends)
    .concat(topPokemonTrends)
    .concat(topEnergyTypeTrends)
    .concat(topArtistTrends)
    .concat(topRarityTrends)


  // create similar data for item ownership
  // create trend for most inventory added for all items / sets / pokemon

  return itemViewTrends
}

export const itemTrendCalculator = {
  calculateFromAnalysisStats,
}