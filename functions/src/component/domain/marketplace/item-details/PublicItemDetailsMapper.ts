import {MarketplaceListingEntity} from "../MarketplaceListingEntity";
import {PublicItemDetails, PublicListingDetails} from "../MarketplaceListingMapper";
import {publicEbayListingDetailMapper} from "../listing-details/PublicEbayListingDetailMapper";
import {EBAY_LISTING_TYPE} from "../listing-details/EbayListingDetails";
import {pokemonCardItemDetailMapper} from "./PokemonCardItemDetailMapper";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "./SinglePokemonCardItemDetails";

const mapPublicInfo = (listing:MarketplaceListingEntity):PublicItemDetails => {
  if (listing.itemType === SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return pokemonCardItemDetailMapper.mapPublicInfo(listing)
  }
  return {}
}

const mapFullInfo = (listing:MarketplaceListingEntity):PublicItemDetails => {
  if (listing.itemType === SINGLE_POKEMON_CARD_ITEM_TYPE) {
    return pokemonCardItemDetailMapper.mapFullInfo(listing)
  }
  return {}
}

export const publicItemDetailMapper = {
  mapFullInfo,
  mapPublicInfo,
}