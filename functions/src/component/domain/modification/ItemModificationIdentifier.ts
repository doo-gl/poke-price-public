import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../marketplace/item-details/SinglePokemonCardItemDetails";
import {ItemModificationIdentificationResult} from "./ItemModificationIdentificationResult";
import {gradingIdentifier} from "./GradingIdentifier";
import {ItemModificationIdentificationRequest} from "./ItemModificationIdentificationRequest";


const identify = (request:ItemModificationIdentificationRequest):ItemModificationIdentificationResult => {
  if (request.item.itemType === SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return gradingIdentifier.identify(request)
  }

  return {itemModification: null, shouldFilter: false}
}

export const itemModificationIdentifier = {
  identify,
}