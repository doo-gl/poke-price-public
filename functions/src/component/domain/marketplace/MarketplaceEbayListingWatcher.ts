import {Create} from "../../database/Entity";
import {EbayOpenListingEntity, ListingState} from "../ebay/open-listing/EbayOpenListingEntity";
import {ebayOpenListingRetriever} from "../ebay/open-listing/EbayOpenListingRetriever";
import {marketplaceListingRetriever} from "./MarketplaceListingRetriever";
import {toInputValueMap} from "../../tools/MapBuilder";
import {ebayToMarketplaceListingConverter} from "./EbayToMarketplaceListingConverter";
import {BatchUpdate} from "../../database/BaseCrudRepository";
import {Conversion, marketplaceListingUpserter} from "./MarketplaceListingUpserter";
import {marketplaceListingDeleter} from "./MarketplaceListingDeleter";
import {ItemEntity} from "../item/ItemEntity";
import {currencyExchanger} from "../money/CurrencyExchanger";
import {logger} from "firebase-functions";


const upsertMarketplaceListings = async (item:ItemEntity, listings:Array<EbayOpenListingEntity>) => {

  // only show ungraded listings in the marketplace for the time being
  // const unmodifiedListings = listings.filter(listing => !listing.itemModification)
  const unmodifiedListings = listings; // trying to show all graded listings too

  const listingCurrencyCodes = listings.map(listing => listing.mostRecentPrice.currencyCode)
  const exchangers = await currencyExchanger.buildExchangers(listingCurrencyCodes)
  const listingCurrencyCodeToExchanger = toInputValueMap(exchangers, ex => ex.toCurrencyCode())

  const listingIds = unmodifiedListings.map(listing => listing.id)
  const preExistingListings = await marketplaceListingRetriever.retrieveForListingIds(listingIds)
  const listingIdToMarketplaceListing = toInputValueMap(preExistingListings, value => value.listingId);
  const conversions:Array<Conversion> = []
  unmodifiedListings.forEach(listing => {
    const preExistingMarketplaceListing = listingIdToMarketplaceListing.get(listing.id) ?? null;
    const exchanger = listingCurrencyCodeToExchanger.get(listing.mostRecentPrice.currencyCode)
    if (!exchanger) {
      logger.warn(`Failed to find exchanger for ${listing.mostRecentPrice.currencyCode} while trying to convert listing: ${listing.listingId}`)
      return
    }
    conversions.push(ebayToMarketplaceListingConverter.convert(item, listing, preExistingMarketplaceListing, exchanger))
  })
  await marketplaceListingUpserter.upsertForConversions(conversions);
}

const deleteMarketplaceListings = async (listings:Array<EbayOpenListingEntity>) => {
  const listingIds = listings.map(listing => listing.id)
  const preExistingListings = await marketplaceListingRetriever.retrieveForListingIds(listingIds)
  await marketplaceListingDeleter.deleteListings(preExistingListings)
}

const onNewOpenListingsForCard = async (item:ItemEntity, creates:Array<Create<EbayOpenListingEntity>>) => {
  if (!item.visible) {
    return;
  }
  const ebayListingIds = creates.map(create => create.listingId);
  const listings = await ebayOpenListingRetriever.retrieveByListingIds(ebayListingIds);
  await upsertMarketplaceListings(item, listings);
}

const onUpdatedListingsForCard = async (item:ItemEntity, updates:Array<BatchUpdate<EbayOpenListingEntity>>) => {

  const listingIds = updates.map(listing => listing.id);
  const listings = await ebayOpenListingRetriever.retrieveByIds(listingIds)
  const endedListings:Array<EbayOpenListingEntity> = [];
  const listingsToUpsert:Array<EbayOpenListingEntity> = [];
  listings.forEach(listing => {
    const isOpen = listing.state === ListingState.OPEN;
    if (isOpen) {
      listingsToUpsert.push(listing)
    } else {
      endedListings.push(listing)
    }
  })

  await deleteMarketplaceListings(endedListings)

  if (!item.visible) {
    return;
  }
  await upsertMarketplaceListings(item, listingsToUpsert);
}

export const marketplaceEbayListingWatcher = {
  onNewOpenListingsForCard,
  onUpdatedListingsForCard,
}