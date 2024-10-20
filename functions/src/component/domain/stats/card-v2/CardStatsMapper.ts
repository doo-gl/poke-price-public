import {CardStatsDtoV2, CardStatsEntityV2} from "./CardStatsEntityV2";
import {PublicCardStatsDto, PublicCardStatsList} from "./PublicCardStatsRetriever";
import {timestampToMoment} from "../../../tools/TimeConverter";
import {entityDtoMapper} from "../../EntityDtoMapper";

const map = (cardStats:CardStatsEntityV2):CardStatsDtoV2 => {
  return {
    ...entityDtoMapper.map(cardStats),
    cardId: cardStats.cardId,
    currencyCode: cardStats.currencyCode,
    periodSizeDays: cardStats.periodSizeDays,
    priceType: cardStats.priceType,
    condition: cardStats.condition,
    selectionId: cardStats.selectionId,
    itemIds: cardStats.itemIds,
    stats: cardStats.stats,
    lastCalculatedAt: cardStats.lastCalculatedAt.toDate().toISOString(),
    from: cardStats.from.toDate().toISOString(),
    to: cardStats.to.toDate().toISOString(),
    nextCalculationTime: cardStats.nextCalculationTime.toDate().toISOString(),
  }
}

const mapPublic = (cardStats:CardStatsEntityV2):PublicCardStatsDto => {
  return {
    cardStatsId: cardStats.id,
    cardId: cardStats.cardId,
    condition: cardStats.condition,
    currencyCode: cardStats.currencyCode,
    priceType: cardStats.priceType,
    lastCalculatedAt: timestampToMoment(cardStats.lastCalculatedAt).toISOString(),
    from: timestampToMoment(cardStats.from).toISOString(),
    to: timestampToMoment(cardStats.to).toISOString(),
    periodSizeDays: cardStats.periodSizeDays,
    stats: null,
  }
}

const mapSubscribed = (cardStats:CardStatsEntityV2):PublicCardStatsDto => {
  return {
    ...mapPublic(cardStats),
    stats: cardStats.stats,
  }
}

const mapPublicList = (cardStats:Array<CardStatsEntityV2>):PublicCardStatsList => {
  return {
    results: cardStats.map(mapPublic),
  }
}

const mapSubscribedList = (cardStats:Array<CardStatsEntityV2>):PublicCardStatsList => {
  return {
    results: cardStats.map(mapSubscribed),
  }
}

export const cardStatsMapper = {
  map,
  mapPublicList,
  mapSubscribedList,
  mapPublic,
  mapSubscribed,
}