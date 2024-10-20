import {EbayOpenListingEntity} from "../../ebay/open-listing/EbayOpenListingEntity";
import {userRetriever} from "../../user/UserRetriever";
import {logger} from "firebase-functions";
import {templateEmailSender} from "../TemplateEmailSender";
import {STANDARD_EMPTY_TEMPLATE_EMAIL_TEMPLATE_NAME, StandardEmptyTemplate} from "../Template";
import moment from "moment";
import {newOpenListingForItemHtmlBuilder} from "./NewOpenListingsForItemHtmlBuilder";
import {comparatorBuilder} from "../../../infrastructure/ComparatorBuilder";
import {setRetriever} from "../../set/SetRetriever";
import {CurrencyAmount, fromCurrencyAmountLike, fromOptionalCurrencyAmountLike} from "../../money/CurrencyAmount";
import {Content} from "../../card/PublicCardDto";
import {publicListingMapper} from "../../ebay/open-listing/public-listing/PublicListingMapper";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {toInputValueMap} from "../../../tools/MapBuilder";
import {removeNulls} from "../../../tools/ArrayNullRemover";
import {EbayListingDetails, ListingType} from "../../ebay/open-listing/public-listing/PublicOpenListingDto";
import capitalize from "capitalize";
import {timeDifferenceCalculator, TimeUnit} from "../../../tools/TimeDifferenceCalculator";
import {TimestampStatic} from "../../../external-lib/Firebase";
import {ItemEntity, legacyIdOrFallback, SingleCardItemDetails} from "../../item/ItemEntity";
import {extractCardName, toCard} from "../../item/CardItem";
import {imageQuerier} from "../../item/ImageQuerier";
import {itemPriceQuerier} from "../../item/ItemPriceQuerier";
import {extractCardNumber} from "../../item/tag/PokemonCardTagExtractor";
import {itemWatchNotificationHistoryCreator} from "../../watch/ItemWatchNotificationHistoryEntity";
import {ItemWatchEntity} from "../../watch/ItemWatchEntity";

const BY_CHEAPEST = comparatorBuilder.combineAll<ListingForEmail>(
  comparatorBuilder.objectAttributeASC(listing => listing.localeListingPrice.amountInMinorUnits),
  comparatorBuilder.objectAttributeASC(listing => listing.listingName),
  comparatorBuilder.objectAttributeASC(listing => listing.id),
)

interface ListingForEmail {
  id:string
  listingUrl:string,
  listingName:string,
  listingPrice:CurrencyAmount,
  localeListingPrice:CurrencyAmount,
  priceDifference:CurrencyAmount|null,
  listingDetails:Content,
}

const buildEmailSubject = (item:ItemEntity, cardDetails:SingleCardItemDetails, listings:Array<EbayOpenListingEntity>):string => {

  const itemName = `${extractCardName(item)} ${extractCardNumber(cardDetails)}`
  return `${listings.length} new listing${listings.length === 1 ? '' : 's'} for ${itemName}`
}

const buildEmailHtml = (item:ItemEntity, cardDetails:SingleCardItemDetails, logoUrl:string|null, listings:Array<ListingForEmail>):string => {
  const itemName = `${extractCardName(item)} ${extractCardNumber(cardDetails)}`
  const title = newOpenListingForItemHtmlBuilder.title(listings.length, itemName)
  const logo = newOpenListingForItemHtmlBuilder.logo(logoUrl)

  const listingHtmlSnippets = listings.slice().sort(BY_CHEAPEST).map(listing => {
    const priceDifference = listing.priceDifference
    let priceDiff = priceDifference?.abs().toString() ?? null;
    if (priceDifference && !priceDifference.isZeroOrPositive()) {
      priceDiff = `+${priceDiff}` // Add the plus to show that prices over the price are not a saving
    }
    return newOpenListingForItemHtmlBuilder.listing({
      listingUrl: listing.listingUrl,
      listingName: listing.listingName,
      listingPrice: listing.listingPrice.toString(),
      priceDiff: priceDiff,
      priceDiffColour: priceDifference && priceDifference.isZeroOrPositive() ? '#6dd65c' : '#f23b2f',
      listingDetails: listing.listingDetails,
    })
  })
  const listingsHtml = listingHtmlSnippets.join(newOpenListingForItemHtmlBuilder.divider())

  const viewAll = newOpenListingForItemHtmlBuilder.viewAllListings(legacyIdOrFallback(item))

  return `
  ${logo}
  ${title}
  ${newOpenListingForItemHtmlBuilder.divider()}
  ${listingsHtml}
  ${newOpenListingForItemHtmlBuilder.divider()}
  ${viewAll}
  `
}

const mapListingDetails = (listingType:ListingType, listingDetails:any):Content => {
  if (listingType !== ListingType.EBAY) {
    return {children: null, type: "empty"}
  }
  const details:EbayListingDetails = listingDetails;


  if (details.listingEndTime && moment(details.listingEndTime).isAfter(moment())) {
    const listingEndTime = moment(details.listingEndTime)
    const now = moment()
    const units:Array<TimeUnit> = listingEndTime.diff(now, 'days') > 1
      ? [TimeUnit.DAY, TimeUnit.HOUR, TimeUnit.MINUTE]
      : [TimeUnit.HOUR, TimeUnit.MINUTE, TimeUnit.SECOND]
    const timeDiffMessage = timeDifferenceCalculator.calculate({
      from: now,
      to: listingEndTime,
      units: units,
      shortLabels: true,
    })
    const timeLeftParagraph:Content = {
      type: "paragraph",
      children: [
        { type: "text", children: `Time left: ` },
        { type: "bold", children: timeDiffMessage },
      ],
    }
    if (details.bidCount !== null) {
      return {
        type: "section",
        children: [
          timeLeftParagraph,
          {
            type: "paragraph",
            children: [
              { type: "text", children: 'Bids: ' },
              { type: "bold", children: `${details.bidCount}` },
            ],
          },
        ],
      }
    } else {
      return {
        type: "section",
        children: [
          timeLeftParagraph,
        ],
      }
    }
  }

  return {
    type: "section",
    children: details.ebayListingTypes.map(type => ({
      type: "paragraph",
      children: [{ type: "text", children: capitalize(type.replace(/_/gim, ' ').toLowerCase()) }],
    })),
  }
}

const mapListings = async (item:ItemEntity, listings:Array<EbayOpenListingEntity>):Promise<Array<ListingForEmail>> => {
  const listingDtos = await publicListingMapper.mapFromCardAndEbayListings(item, CurrencyCode.GBP, listings)
  const listingIdToListing = toInputValueMap(listings, i => i.id)
  return removeNulls(listingDtos.map<ListingForEmail|null>(listingDto => {
    const listing = listingIdToListing.get(listingDto.listingId)
    if (!listing) {
      return null;
    }
    const localeListingPrice = fromCurrencyAmountLike(listingDto.localeListingPrice)
    const itemPrice = fromOptionalCurrencyAmountLike(itemPriceQuerier.pokePrice(item)?.price ?? null)
    const diffPrice = itemPrice
      ? itemPrice.subtract(localeListingPrice)
      : null;
    return {
      id: listing.id,
      listingUrl: listing.listingUrl,
      listingName: listing.listingName,
      listingPrice: fromCurrencyAmountLike(listingDto.listingPrice),
      localeListingPrice,
      priceDifference: diffPrice,
      listingDetails: mapListingDetails(listingDto.listingType, listingDto.listingDetails),
    }
  }))
}

const send = async (itemWatch:ItemWatchEntity, item:ItemEntity, listings:Array<EbayOpenListingEntity>):Promise<void> => {
  const userId = itemWatch.userId;
  if (listings.length === 0) {
    logger.info(`No listings passed to email user: ${userId} about, skipping.`)
    return;
  }
  const cardDetails = toCard(item);
  if (!cardDetails) {
    logger.info(`Item: ${item._id.toString()} is not a pokemon card, skipping`)
    return;
  }
  const image = imageQuerier.getFirst(item.images, {tags: ['jpg']})
  const user = await userRetriever.retrieveOptional(userId)
  if (!user?.details?.email || !user?.details?.email.includes('@')) {
    logger.warn(`Not sending watch email to user: ${userId}, user does not exist or does not have email`)
    return;
  }
  const set = await setRetriever.retrieve(cardDetails.setId)
  const listingsForEmail = await mapListings(item, listings)

  const subject = buildEmailSubject(item, cardDetails, listings)
  const html = buildEmailHtml(item, cardDetails, image?.url ?? null, listingsForEmail)

  const itemId = item._id.toString()
  const listingIds = listings.map(listing => listing.id);

  const attempt = await templateEmailSender.send<StandardEmptyTemplate>(
    // `NEW_OPEN_LISTINGS_${userId}_${item._id.toString()}}`,
    `NEW_OPEN_LISTINGS_${userId}_${item._id.toString()}_${moment().format('YYYY_MM_DD_HH_mm')}`,
    userId,
    {
      name: STANDARD_EMPTY_TEMPLATE_EMAIL_TEMPLATE_NAME,
      subject,
      variables: {
        TEMPLATE_BODY_HTML: html,
      },
      metadata: {
        timestamp: TimestampStatic.now(),
        userId: userId,
        itemId,
        listingIds,
      },
    }
  )
  await itemWatchNotificationHistoryCreator.create({
    userId,
    itemId,
    itemWatchId: itemWatch.id,
    timestamp: TimestampStatic.now(),
    notificationType: "EMAIL",
    notificationDetails: {
      emailAttemptId: attempt.id,
      emailType: 'NEW_LISTINGS',
      newListingIds: listingIds,
    },
  });
}

export const newOpenListingsForItemEmailSender = {
  send,
}