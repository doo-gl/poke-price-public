import {CardPriceStatsEntity} from "./CardPriceStatsEntity";
import {CardPriceStatsDto} from "./CardPriceStatsDto";
import {entityDtoMapper} from "../../EntityDtoMapper";
import {timestampToMoment} from "../../../tools/TimeConverter";
import {languageOrFallback} from "../../item/ItemEntity";


const map = (entity:CardPriceStatsEntity):CardPriceStatsDto => {
  return {
    ...entityDtoMapper.map(entity),
    series: entity.series,
    set: entity.set,
    numberInSet: entity.numberInSet,
    variant: entity.variant,
    language: languageOrFallback(entity.language),
    cardId: entity.cardId,
    searchUrl: entity.searchUrl,
    searchId: entity.searchId,
    lastCalculationTime: timestampToMoment(entity.lastCalculationTime),
    mostRecentPrice: timestampToMoment(entity.lastCalculationTime),
    shortViewStats: entity.shortViewStats,
    longViewStats: entity.longViewStats,
    openListingStats: entity.openListingStats,
  }
}

export const cardPriceStatsDtoMapper = {
  map,
}