import {MarketplaceListingEntity} from "../MarketplaceListingEntity";
import {PublicItemDetails} from "../MarketplaceListingMapper";
import {CardCondition} from "../../historical-card-price/CardCondition";
import {singlePokemonCardItemDetailMapper} from "./SinglePokemonCardItemDetails";

export type PublicPokemonCardItemDetails = PublicItemDetails

export interface FullInfoPokemonCardItemDetails extends PublicPokemonCardItemDetails {
  condition:CardCondition,
}

const mapPublicInfo = (listing:MarketplaceListingEntity):PublicItemDetails => {
  return {}
}

const mapFullInfo = (listing:MarketplaceListingEntity):PublicItemDetails => {
  const itemDetails = singlePokemonCardItemDetailMapper.optionalDetails(listing)
  if (!itemDetails) {
    return {}
  }
  const fullDetails:FullInfoPokemonCardItemDetails = {
    condition: itemDetails.condition,
  }
  return fullDetails;
}

export const pokemonCardItemDetailMapper = {
  mapPublicInfo,
  mapFullInfo,
}