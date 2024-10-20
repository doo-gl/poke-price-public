import {UserEntity} from "../../../user/UserEntity";
import {ListingDto} from "./PublicOpenListingDto";
import {ebayOpenListingRetriever} from "../EbayOpenListingRetriever";
import {publicListingMapper} from "./PublicListingMapper";
import {JSONSchemaType} from "ajv";
import {
  CurrencyAmount,
  CurrencyAmountLike,
  fromCurrencyAmountLike,
  fromOptionalCurrencyAmountLike,
  Max,
  Min,
} from "../../../money/CurrencyAmount";
import {userMembershipQuerier} from "../../../membership/UserMembershipQuerier";
import {CurrencyCode} from "../../../money/CurrencyCodes";
import {ebaySearchParamRetriever} from "../../search-param/EbayCardSearchParamRetriever";
import {ItemEntity, legacyIdOrFallback} from "../../../item/ItemEntity";
import {itemPriceQuerier} from "../../../item/ItemPriceQuerier";
import {cardItemRetriever} from "../../../item/CardItemRetriever";

export const publicListingRequestSchema:JSONSchemaType<PublicListingRequest> = {
  type: "object",
  properties: {
    itemId: { type: "string" },
    userCurrency: { type: "string", nullable: true },
  },
  additionalProperties: false,
  required: ["itemId"],
}
export interface PublicListingRequest {
  itemId:string,
  userCurrency?:CurrencyCode,
}

export interface HiddenListingDetails {
  numberOfHiddenListings:number,
  lowestPrice:CurrencyAmountLike,
  highestPrice:CurrencyAmountLike,
}

export interface PublicListingResponse {
  listings:Array<ListingDto>
  hiddenListingDetails:HiddenListingDetails|null
}

const filterHiddenListings = (user:UserEntity|null, userCurrency:CurrencyCode, card:ItemEntity, listings:Array<ListingDto>):PublicListingResponse => {

  const soldDetails = itemPriceQuerier.soldDetails(card, userCurrency)
  const listingDetails = itemPriceQuerier.listingDetails(card, userCurrency)
  const itemPrice = fromOptionalCurrencyAmountLike((soldDetails?.price || listingDetails?.price) ?? null)

  if (user && userMembershipQuerier.isPokePriceProUser(user) || !itemPrice) {
    return {
      listings,
      hiddenListingDetails: null,
    }
  }


  const publicListings:Array<ListingDto> = [];
  const subscribedListings:Array<ListingDto> = [];
  let lowestPrice:CurrencyAmount = Max(itemPrice.currencyCode)
  let highestPrice:CurrencyAmount = Min(itemPrice.currencyCode)

  listings.forEach(listing => {

    const localeListingPrice = fromCurrencyAmountLike(listing.localeListingPrice)

    const isOverItemPrice = localeListingPrice.greaterThanOrEqual(itemPrice)

    if (isOverItemPrice) {
      publicListings.push(listing)
    } else {
      subscribedListings.push(listing)
      if (localeListingPrice.greaterThan(highestPrice)) {
        highestPrice = localeListingPrice
      }
      if (localeListingPrice.lessThan(lowestPrice)) {
        lowestPrice = localeListingPrice
      }
    }
  })

  const numberOfHiddenListings:number = subscribedListings.length
  const hiddenListingDetails = numberOfHiddenListings > 0
    ? ({
      numberOfHiddenListings,
      lowestPrice: lowestPrice.toCurrencyAmountLike(),
      highestPrice: highestPrice.toCurrencyAmountLike(),
    })
    : null;

  return {
    listings: publicListings,
    hiddenListingDetails,
  }
}



const retrieveListings = async (user:UserEntity|null, request:PublicListingRequest):Promise<PublicListingResponse> => {
  const card = await cardItemRetriever.retrieve(request.itemId)
  const itemId = legacyIdOrFallback(card)
  if (!card.visible) {
    return { listings: [], hiddenListingDetails: null }
  }

  const searchParams = await ebaySearchParamRetriever.retrieveSearchParamForCardId(itemId)
  if (!searchParams) {
    return { listings: [], hiddenListingDetails: null }
  }
  const currencyCode = request.userCurrency ?? user?.preferredCurrency ?? CurrencyCode.GBP
  const listings = await ebayOpenListingRetriever.retrieveOpenByCardIdAndBySearchId(itemId, searchParams.id)
  const listingDtos = await publicListingMapper.mapFromCardAndEbayListings(card, currencyCode, listings)
  const response = filterHiddenListings(user, currencyCode, card, listingDtos)
  return response
}

export const publicListingRetriever = {
  retrieveListings,
}