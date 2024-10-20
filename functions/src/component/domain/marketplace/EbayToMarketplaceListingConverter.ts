import {EbayOpenListingEntity} from "../ebay/open-listing/EbayOpenListingEntity";
import {MarketplaceListingEntity} from "./MarketplaceListingEntity";
import {BatchUpdate, Create, Update} from "../../database/mongo/MongoEntity";
import {Images, ItemEntity, legacyIdOrFallback} from "../item/ItemEntity";
import {SearchTag, toTag} from "../search-tag/SearchTagEntity";
import {searchTagToTagTokenMapper} from "../search-tag/SearchTagToTagTokenMapper";
import {lodash} from "../../external-lib/Lodash";
import {toInputValueMap} from "../../tools/MapBuilder";
import {Conversion} from "./MarketplaceListingUpserter";
import {SINGLE_POKEMON_CARD_ITEM_TYPE, SinglePokemonCardItemDetails} from "./item-details/SinglePokemonCardItemDetails";
import {EBAY_LISTING_TYPE, EbayListingDetails} from "./listing-details/EbayListingDetails";
import {marketplaceListingSortExtractor} from "./MarketplaceListingSortExtractor";
import {ebayListingPriceExtractor} from "./EbayListingPriceExtractor";
import {ebayListingTagExtractor} from "./EbayListingTagExtractor";
import {popularTagExtractor} from "./PopularTagExtractor";
import {CurrencyExchanger} from "../money/CurrencyExchanger";

const convertImages = (listing:EbayOpenListingEntity):Images => {
  if (!listing.imageUrls) {
    return { images: [] }
  }
  return {
    images: listing.imageUrls.map(imageUrl => {
      return {
        variants: [
          {
            dimensions: null,
            url: imageUrl,
            tags: [],
          },
        ],
      }
    }),
  }
}

const extractItemDetails = (listing:EbayOpenListingEntity, item:ItemEntity):SinglePokemonCardItemDetails => {
  return {
    condition: listing.condition,
  }
}

const extractListingDetails = (listing:EbayOpenListingEntity, item:ItemEntity):EbayListingDetails => {
  return {
    listingId: listing.listingId,
    listingName: listing.listingName,
    listingDescription: listing.listingDescription,
    // @ts-ignore
    listingTypes: listing.listingTypes,
    listingUrl: listing.listingUrl,
    listingMessage: listing.listingMessage,
    bidPrice: listing.mostRecentBidCount !== null ? listing.mostRecentPrice : null,
    buyItNowPrice: listing.buyItNowPrice,
    mostRecentBidCount: listing.mostRecentBidCount,
    sellersNotes: listing.sellersNotes,
    listingEndTime: listing.listingEndTime?.toDate() ?? null,
    listingSpecifics: listing.listingSpecifics,
    images: convertImages(listing),
  }
}

const convertCreate = (listing:EbayOpenListingEntity, item:ItemEntity, exchanger:CurrencyExchanger):Create<MarketplaceListingEntity> => {
  const currentBidPrice = ebayListingPriceExtractor.calculateBidPrice(listing, item)
  const bidProfit = ebayListingPriceExtractor.calculateBidProfit(listing, item, exchanger)
  const buyNowProfit = ebayListingPriceExtractor.calculateBuyNowProfit(listing, item, exchanger)

  const searchTags = ebayListingTagExtractor.extractTags(listing, item, exchanger);
  const tags = searchTagToTagTokenMapper.map(searchTags);
  const itemDetails = extractItemDetails(listing, item);
  const listingDetails = extractListingDetails(listing, item);
  const currentItemPrice = ebayListingPriceExtractor.calculateCurrentItemPrice(listing, item, exchanger)
  const currentPrice = ebayListingPriceExtractor.calculateCurrentPrice(listing, item);
  const currentProfit = ebayListingPriceExtractor.calculateCurrentProfit(listing, item, exchanger);
  const listingEndsAt = listing.listingEndTime?.toDate() ?? null;
  const sort = marketplaceListingSortExtractor.extractFromDetails(currentPrice, currentProfit, listingEndsAt)
  const popularTags = popularTagExtractor.extract(tags);


  const create:Create<MarketplaceListingEntity> = {
    itemId: legacyIdOrFallback(item),
    itemType: SINGLE_POKEMON_CARD_ITEM_TYPE,
    itemDetails,
    listingId: listing.id,
    listingType: EBAY_LISTING_TYPE,
    listingDetails,
    currentBidPrice,
    currentBuyNowPrice: listing.buyItNowPrice,
    currentItemPrice,
    currentPrice,
    currentProfit,
    mostRecentUpdate: listing.mostRecentUpdate.toDate(),
    listingEndsAt,
    currentBidProfit: bidProfit?.toCurrencyAmountLike() ?? null,
    currentBuyNowProfit: buyNowProfit?.toCurrencyAmountLike() ?? null,
    tags,
    searchTags,
    popularTags,
    sort,
  }

  return create;
}

const convertUpdate = (
  preExistingListing:MarketplaceListingEntity,
  listing:EbayOpenListingEntity,
  item:ItemEntity,
  exchanger:CurrencyExchanger
):BatchUpdate<MarketplaceListingEntity>|null => {
  const update:Update<MarketplaceListingEntity> = {}

  if (lodash.isNotEqual(preExistingListing.itemId, legacyIdOrFallback(item))) {
    update.itemId = legacyIdOrFallback(item);
  }

  const itemDetails = extractItemDetails(listing, item);
  if (lodash.isNotEqual(preExistingListing.itemDetails, itemDetails)) {
    update.itemDetails = itemDetails;
  }

  const listingDetails = extractListingDetails(listing, item);
  if (lodash.isNotEqual(preExistingListing.listingDetails, listingDetails)) {
    update.listingDetails = listingDetails;
  }

  const currentBidPrice = listing.mostRecentBidCount !== null ? listing.mostRecentPrice : null;
  if (lodash.isNotEqual(preExistingListing.currentBidPrice, currentBidPrice)) {
    update.currentBidPrice = currentBidPrice;
  }

  const currentBuyNowPrice = listing.buyItNowPrice
  if (lodash.isNotEqual(preExistingListing.currentBuyNowPrice, currentBuyNowPrice)) {
    update.currentBuyNowPrice = currentBuyNowPrice;
  }

  const currentBidProfit = ebayListingPriceExtractor.calculateBidProfit(listing, item, exchanger)?.toCurrencyAmountLike() ?? null
  if (lodash.isNotEqual(preExistingListing.currentBidProfit, currentBidProfit)) {
    update.currentBidProfit = currentBidProfit;
  }

  const currentBuyNowProfit = ebayListingPriceExtractor.calculateBuyNowProfit(listing, item, exchanger)?.toCurrencyAmountLike() ?? null
  if (lodash.isNotEqual(preExistingListing.currentBuyNowProfit, currentBuyNowProfit)) {
    update.currentBuyNowProfit = currentBuyNowProfit;
  }

  const currentItemPrice = ebayListingPriceExtractor.calculateCurrentItemPrice(listing, item, exchanger)
  if (lodash.isNotEqual(preExistingListing.currentItemPrice, currentItemPrice)) {
    update.currentItemPrice = currentItemPrice;
  }

  const currentProfit = ebayListingPriceExtractor.calculateCurrentProfit(listing, item, exchanger)?.toCurrencyAmountLike() ?? null
  if (lodash.isNotEqual(preExistingListing.currentProfit, currentProfit)) {
    update.currentProfit = currentProfit;
  }

  const currentPrice = ebayListingPriceExtractor.calculateCurrentPrice(listing, item)?.toCurrencyAmountLike() ?? null
  if (lodash.isNotEqual(preExistingListing.currentProfit, currentProfit)) {
    update.currentPrice = currentPrice;
  }

  const listingEndsAt = listing.listingEndTime?.toDate() ?? null;
  if (lodash.isNotEqual(preExistingListing.listingEndsAt?.getTime(), listingEndsAt?.getTime())) {
    update.listingEndsAt = listingEndsAt;
  }

  const mostRecentUpdate = listing.mostRecentUpdate.toDate();
  if (lodash.isNotEqual(preExistingListing.mostRecentUpdate?.getTime(), mostRecentUpdate?.getTime())) {
    update.mostRecentUpdate = mostRecentUpdate;
  }

  const sort = marketplaceListingSortExtractor.extractFromDetails(currentPrice, currentProfit, listingEndsAt);
  if (lodash.isNotEqual(preExistingListing.sort, sort)) {
    update.sort = sort;
  }

  const searchTags = ebayListingTagExtractor.extractTags(listing, item, exchanger);
  const tags = searchTagToTagTokenMapper.map(searchTags);
  if (lodash.isNotEqual(preExistingListing.searchTags, searchTags)) {
    update.searchTags = searchTags;
    update.tags = tags;
  }

  const popularTags = popularTagExtractor.extract(tags);
  if (lodash.isNotEqual(preExistingListing.popularTags, popularTags)) {
    update.popularTags = popularTags;
  }

  if (Object.keys(update).length === 0) {
    return null;
  }
  return { id: preExistingListing._id, update };
}

const convert = (
  item:ItemEntity,
  listing:EbayOpenListingEntity,
  preExistingListing:MarketplaceListingEntity|null,
  exchanger:CurrencyExchanger,
):Conversion => {
  if (!preExistingListing) {
    const create = convertCreate(listing, item, exchanger)
    return {
      create,
      newSearchTags: create.searchTags,
      removedSearchTags: [],
    }
  }

  const update = convertUpdate(preExistingListing, listing, item, exchanger)
  if (!update) {
    return { newSearchTags: [], removedSearchTags: [] }
  }

  const currentTags = toInputValueMap(update.update.searchTags ?? [], tag => toTag(tag));
  const previousTags = toInputValueMap(preExistingListing.searchTags, tag => toTag(tag));

  const newSearchTags:Array<SearchTag> = [];
  currentTags.forEach((value, key) => {
    if (!previousTags.has(key)) {
      newSearchTags.push(value)
    }
  })

  const removedSearchTags:Array<SearchTag> = [];
  previousTags.forEach((value, key) => {
    if (!currentTags.has(key)) {
      removedSearchTags.push(value)
    }
  })

  return {
    update,
    newSearchTags,
    removedSearchTags,
  }
}

export const ebayToMarketplaceListingConverter = {
  convert,
  convertImages,
}