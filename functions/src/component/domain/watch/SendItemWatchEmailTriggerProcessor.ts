import {SendItemWatchEmailRequest} from "../../event/SendItemWatchEmailTrigger";
import {ebayOpenListingRetriever} from "../ebay/open-listing/EbayOpenListingRetriever";
import {itemWatchRetriever} from "./ItemWatchRetriever";
import {ItemWatchEntity} from "./ItemWatchEntity";
import {EbayOpenListingEntity} from "../ebay/open-listing/EbayOpenListingEntity";
import {ConcurrentPromiseQueue} from "concurrent-promise-queue";
import {toInputValueMap} from "../../tools/MapBuilder";
import {itemWatchNotificationHistoryRetriever} from "./ItemWatchNotificationHistoryRetriever";
import {jsonValidatorV2} from "../../tools/JsonValidatorV2";
import {emailWatchNotificationDetailSchema} from "./ItemWatchNotificationHistoryEntity";
import {newOpenListingsForItemEmailSender} from "../email/item-watch/NewOpenListingsForItemEmailSender";
import {logger} from "firebase-functions";
import {ItemEntity, legacyIdOrFallback} from "../item/ItemEntity";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {userRetriever} from "../user/UserRetriever";
import {CurrencyCode} from "../money/CurrencyCodes";

const filterListingsToTellUserAbout = async (itemWatch:ItemWatchEntity, listings:Array<EbayOpenListingEntity>):Promise<Array<EbayOpenListingEntity>> => {
  const user = await userRetriever.retrieveOptional(itemWatch.userId)
  if (!user) {
    return []
  }
  const userCurrency = user.preferredCurrency
  const hasCurrencyMatchingUser = (listing:EbayOpenListingEntity) => {
    if (!userCurrency) {
      return true
    }
    return userCurrency === listing.mostRecentPrice.currencyCode
  }

  const listingIdToListing = toInputValueMap(listings, listing => listing.id)
  const pastNotifications = await itemWatchNotificationHistoryRetriever.retrieveByItemWatchIdAndNewListingIds(itemWatch.id, [...listingIdToListing.keys()]);
  const alreadyNotifiedListingIds = new Set<string>()
  pastNotifications.forEach(pastNotification => {
    const detailValidationResult = jsonValidatorV2.validate(pastNotification.notificationDetails, emailWatchNotificationDetailSchema);
    if (!detailValidationResult.isValid || !detailValidationResult.result) {
      return
    }
    const pastListingIds = detailValidationResult.result.newListingIds
    pastListingIds.forEach(listingId => {
      alreadyNotifiedListingIds.add(listingId)
    })
  })
  const hasNotBeenNotifiedAboutListing = (listing:EbayOpenListingEntity):boolean => {
    return !alreadyNotifiedListingIds.has(listing.id)
  }

  return [...listingIdToListing.values()]
    .filter(
      listing =>
        hasNotBeenNotifiedAboutListing(listing)
        && hasCurrencyMatchingUser(listing)
    )
}

const processForWatch = async (itemWatch:ItemWatchEntity, item:ItemEntity, listings:Array<EbayOpenListingEntity>):Promise<void> => {
  const listingsToNotifyUserAbout = await filterListingsToTellUserAbout(itemWatch, listings)
  logger.info(`Going to notify user: ${itemWatch.userId} about ${listingsToNotifyUserAbout.length} listings on item: ${item._id.toString()}`)
  await newOpenListingsForItemEmailSender.send(itemWatch, item, listingsToNotifyUserAbout)
}

const process = async (request:SendItemWatchEmailRequest):Promise<void> => {
  logger.info(`Processing item watch email event for item: ${request.itemId}`)
  const item = await cardItemRetriever.retrieve(request.itemId)
  const listings = await ebayOpenListingRetriever.retrieveByIds(request.listingIds)
  if (listings.length === 0) {
    logger.info(`Found no listings for Ids: ${request.listingIds.join(',')}`)
    return
  }
  const itemWatches = await itemWatchRetriever.retrieveActiveByItemId(item._id.toString())
  if (item.legacyId) {
    const legacyItemWatches = await itemWatchRetriever.retrieveActiveByItemId(item.legacyId)
    legacyItemWatches.forEach(watch => itemWatches.push(watch))
  }
  logger.info(`Found ${itemWatches.length} item watches for item: ${item._id.toString()}`)
  const queue = new ConcurrentPromiseQueue({maxNumberOfConcurrentPromises: 5})
  await Promise.all(
    itemWatches.map(async itemWatch => {
      await queue.addPromise(async () => {
        await processForWatch(itemWatch, item, listings)
      })
    })
  )
}

export const sendItemWatchEmailTriggerProcessor = {
  process,
}