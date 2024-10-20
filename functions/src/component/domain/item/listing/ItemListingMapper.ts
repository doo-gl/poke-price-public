import {EbayOpenListingEntity, ListingState} from "../../ebay/open-listing/EbayOpenListingEntity";
import {PublicMarketplaceListing} from "../../marketplace/MarketplaceListingMapper";
import {ItemEntity} from "../ItemEntity";
import {EBAY_LISTING_TYPE} from "../../marketplace/listing-details/EbayListingDetails";
import {FullInfoEbayListingDetails} from "../../marketplace/listing-details/PublicEbayListingDetailMapper";
import {ebayListingPriceExtractor} from "../../marketplace/EbayListingPriceExtractor";
import {SINGLE_POKEMON_CARD_ITEM_TYPE} from "../../marketplace/item-details/SinglePokemonCardItemDetails";
import {FullInfoPokemonCardItemDetails} from "../../marketplace/item-details/PokemonCardItemDetailMapper";
import {ebayListingTagExtractor} from "../../marketplace/EbayListingTagExtractor";
import {searchTagToTagTokenMapper} from "../../search-tag/SearchTagToTagTokenMapper";
import {ebayToMarketplaceListingConverter} from "../../marketplace/EbayToMarketplaceListingConverter";
import {ItemListingState} from "./ItemListingEntity";
import {CurrencyExchanger} from "../../money/CurrencyExchanger";

// going to just make the item listing follow the market listing for now
// when we move listings to the generic model they can be joined
export interface PublicItemListingDto extends Omit<PublicMarketplaceListing, 'id'> {
  state:ItemListingState,
  itemSaleId:string|null,
}

const mapListingState = (listingState:ListingState):ItemListingState => {
  switch (listingState) {
    case ListingState.OPEN:
      return ItemListingState.OPEN;
    case ListingState.ENDED:
      return ItemListingState.FINISHED;
    default:
      return ItemListingState.UNKNOWN;
  }
}

const mapEbayOpenListingToDto = (listing:EbayOpenListingEntity, item:ItemEntity, exchanger:CurrencyExchanger):PublicItemListingDto => {

  const listingDetails:FullInfoEbayListingDetails = {
    listingName: listing.listingName,
    // @ts-ignore
    listingTypes: listing.listingTypes,
    mostRecentBidCount: listing.mostRecentBidCount,
    listingUrl: listing.listingUrl,
    listingImages: ebayToMarketplaceListingConverter.convertImages(listing),
  }
  const itemDetails:FullInfoPokemonCardItemDetails = {
    condition: listing.condition,
  }

  const searchTags = ebayListingTagExtractor.extractTags(listing, item, exchanger);
  const tags = searchTagToTagTokenMapper.map(searchTags);

  return {
    listingId: listing.listingId,
    listingType: EBAY_LISTING_TYPE,
    listingDetails,
    itemSaleId: listing.historicalCardPriceId,
    state: mapListingState(listing.state),
    listingEndsAt: listing.listingEndTime?.toDate().toISOString() ?? null,
    mostRecentUpdate: listing.mostRecentUpdate.toDate().toISOString(),
    currentItemPrice: ebayListingPriceExtractor.calculateCurrentItemPrice(listing, item, exchanger),
    currentPrice: ebayListingPriceExtractor.calculateCurrentPrice(listing, item),
    currentProfit: ebayListingPriceExtractor.calculateCurrentProfit(listing, item, exchanger),
    currentBidPrice: ebayListingPriceExtractor.calculateBidPrice(listing, item),
    currentBidProfit: ebayListingPriceExtractor.calculateBidProfit(listing, item, exchanger),
    currentBuyNowPrice: ebayListingPriceExtractor.calculateBuyNowPrice(listing, item),
    currentBuyNowProfit: ebayListingPriceExtractor.calculateBuyNowProfit(listing, item, exchanger),
    itemType: SINGLE_POKEMON_CARD_ITEM_TYPE,
    itemId: listing.cardId,
    itemDetails,
    tags,
    searchTags,
  }
}

export const itemListingMapper = {
  mapEbayOpenListingToDto,
}