import {SetPriceStatsEntity} from "./SetPriceStatsEntity";
import {SetPriceStatsDto} from "./SetPriceStatsDto";
import {entityDtoMapper} from "../../EntityDtoMapper";
import {timestampToMoment} from "../../../tools/TimeConverter";


const map = (entity:SetPriceStatsEntity):SetPriceStatsDto => {
  return {
    ...entityDtoMapper.map(entity),
    series: entity.series,
    set: entity.set,
    setId: entity.setId,
    lastCalculationTime: timestampToMoment(entity.lastCalculationTime),
    mostRecentPrice: timestampToMoment(entity.mostRecentPrice),
    totalSetPokePrice: entity.totalSetPokePrice,
  }
}

export const setPriceStatsDtoMapper = {
  map,
}