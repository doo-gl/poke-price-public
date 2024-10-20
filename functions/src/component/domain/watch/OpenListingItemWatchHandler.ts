import {EbayOpenListingEntity} from "../ebay/open-listing/EbayOpenListingEntity";
import {Create} from "../../database/Entity";
import {toInputValueMultiMap} from "../../tools/MapBuilder";
import {itemWatchRetriever} from "./ItemWatchRetriever";
import {toSet} from "../../tools/SetBuilder";
import {ebayOpenListingRetriever} from "../ebay/open-listing/EbayOpenListingRetriever";
import {eventPublisher} from "../../event/EventPublisher";
import {SendItemWatchEmailPublishRequest} from "../../event/SendItemWatchEmailTrigger";
import {logger} from "firebase-functions";
import {timestampToMoment} from "../../tools/TimeConverter";
import moment from "moment/moment";
import {BatchUpdate} from "../../database/BaseCrudRepository";
import {itemRetriever} from "../item/ItemRetriever";

const onNewOpenListings = async (creates:Array<Create<EbayOpenListingEntity>>):Promise<void> => {
  const itemIdToListings = toInputValueMultiMap(creates, listing => listing.cardId)
  await Promise.all(
    [...itemIdToListings.entries()].map(entry => {
      return onNewOpenListingsForItem(entry[0], entry[1])
    })
  )
}

const onCheckedOpenListings = async (listings:Array<EbayOpenListingEntity>):Promise<void> => {
  const itemIdToListings = toInputValueMultiMap(listings, listing => listing.cardId)
  await Promise.all(
    [...itemIdToListings.entries()].map(entry => {
      return onCheckedOpenListingsForItem(entry[0], entry[1])
    })
  )
}

const filterListingsToSend = (listings:Array<EbayOpenListingEntity>):Array<EbayOpenListingEntity> => {
  return listings.filter(listing => {
    const opportunity = listing.buyingOpportunity;
    if (!opportunity) {
      return false;
    }
    const isGoodOpportunity = opportunity.score >= 30;
    const listingEndsSoon = opportunity.listingEnds && timestampToMoment(opportunity.listingEnds).diff(moment(), 'hours') <= 48
    const isRelevantNow = opportunity.canBuyNow || !!listingEndsSoon;
    return isGoodOpportunity && isRelevantNow;
  })
}

const onNewOpenListingsForItem = async (itemId:string, creates:Array<Create<EbayOpenListingEntity>>):Promise<void> => {
  const item = await itemRetriever.retrieveByIdOrLegacyId(itemId)
  const itemHasActiveWatches = await itemWatchRetriever.itemHasActiveWatches(item._id.toString())
  if (!itemHasActiveWatches) {
    // logger.info(`Item: ${item._id.toString()} has no active watches, so no item watch email event will be sent.`)
    return;
  }
  const ebayListingIds = toSet(creates, create => create.listingId)
  const listings = await ebayOpenListingRetriever.retrieveByCardIdAndListingIds(itemId, [...ebayListingIds.values()])

  const listingIds = filterListingsToSend(listings)
    .map(listing => listing.id)

  await sendEvent(item._id.toString(), listingIds)
}

const onUpdatedOpenListingsForItem = async (legacyItemId:string|undefined, updates:Array<BatchUpdate<EbayOpenListingEntity>>):Promise<void> => {
  if (!legacyItemId) {
    return ;
  }
  const item = await itemRetriever.retrieveByIdOrLegacyId(legacyItemId)
  const itemHasActiveWatches = await itemWatchRetriever.itemHasActiveWatches(item._id.toString())
  if (!itemHasActiveWatches) {
    // logger.info(`Item: ${item._id.toString()} has no active watches, so no item watch email event will be sent.`)
    return;
  }
  const updateListingIds = toSet(updates, update => update.id)
  const listings = await ebayOpenListingRetriever.retrieveByIds([...updateListingIds.values()])

  const listingIds = filterListingsToSend(listings)
    .map(listing => listing.id)

  await sendEvent(item._id.toString(), listingIds)
}

const onCheckedOpenListingsForItem = async (itemId:string, listings:Array<EbayOpenListingEntity>):Promise<void> => {
  const item = await itemRetriever.retrieveByIdOrLegacyId(itemId)
  const itemHasActiveWatches = await itemWatchRetriever.itemHasActiveWatches(item._id.toString())
  if (!itemHasActiveWatches) {
    // logger.info(`Item: ${item._id.toString()} has no active watches, so no item watch email event will be sent.`)
    return;
  }
  const listingIds = filterListingsToSend(listings)
    .map(listing => listing.id)

  await sendEvent(item._id.toString(), listingIds)
}

const sendEvent = async (itemId:string, listingIds:Array<string>):Promise<void> => {
  if (listingIds.length === 0) {
    return;
  }

  const event:SendItemWatchEmailPublishRequest = {
    topicName: "send-item-watch-email",
    data: {
      itemId,
      listingIds,
    },
  }
  await eventPublisher.publish(event)
}

export const openListingItemWatchHandler = {
  onNewOpenListings,
  onCheckedOpenListings,
  onUpdatedOpenListingsForItem,
}