import {EbayCardSearchParamEntity} from "./EbayCardSearchParamEntity";
import {EbayCardSearchParamDto} from "./EbaySearchParamDto";
import {entityDtoMapper} from "../../EntityDtoMapper";
import {timestampToMoment} from "../../../tools/TimeConverter";


const map = (entity:EbayCardSearchParamEntity):EbayCardSearchParamDto => {
  return {
    ...entityDtoMapper.map(entity),
    cardId: entity.cardId,
    searchUrl: entity.searchUrl,
    active: entity.active,
    includeKeywords: entity.includeKeywords,
    excludeKeywords: entity.excludeKeywords,
    lastReconciled: timestampToMoment(entity.lastReconciled).toISOString(),
  }
}

export const ebaySearchParamDtoMapper = {
  map,
}