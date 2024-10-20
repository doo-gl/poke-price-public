import {CardPriceSelectionDto, CardPriceSelectionEntity} from "./CardPriceSelectionEntity";
import {entityDtoMapper} from "../../EntityDtoMapper";


const map = (selection:CardPriceSelectionEntity):CardPriceSelectionDto => {
  return {
    ...entityDtoMapper.map(selection),
    cardId: selection.cardId,
    condition: selection.condition,
    priceType: selection.priceType,
    currencyCode: selection.currencyCode,
    searchParams: selection.searchParams,
    hasReconciled: selection.hasReconciled,
    searchId: selection.searchId,
  }
}

export const cardSelectionMapper = {
  map,
}