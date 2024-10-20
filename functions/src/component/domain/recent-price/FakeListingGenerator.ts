import {EbayOpenListingEntity, ListingState, ListingType} from "../ebay/open-listing/EbayOpenListingEntity";
import {CardCondition} from "../historical-card-price/CardCondition";
import {CurrencyCode} from "../money/CurrencyCodes";
import {momentToTimestamp} from "../../tools/TimeConverter";
import moment from "moment/moment";
import {TimestampStatic} from "../../external-lib/Firebase";


const SOURCE_LISTING:EbayOpenListingEntity = {
  "listingEndTime": TimestampStatic.now(),
  "listingDescription": "Pokemon - Aegislash V - 126/185 - SWSH Vivid Voltage - Half Art. Dispatched with Royal Mail 1st Class Letter. ",
  "state": ListingState.OPEN,
  "listingSpecifics": {
    "Card Size": "Standard",
    "Game": "Pokémon TCG",
    "Card Name": "Aegislash",
    "Card Condition": "Near Mint",
    "Manufacturer": "Pokemon",
    "Character": "Aegislash",
    "Graded": "No",
    "Language": "English",
    "Features": "Holo",
    "Speciality": "V",
    "Rarity": "Ultra Rare",
    "Set": "Vivid Voltage",
    "Finish": "Holo",
    "Card Type": "Pokémon",
  },
  "unknownDetails": null,
  "buyingOpportunity": null,
  "dateCreated": TimestampStatic.now(),
  "history": [
    {
      "timestamp": TimestampStatic.now(),
      "bidCount": 0,
      "price": {
        "currencyCode": CurrencyCode.GBP,
        "amountInMinorUnits": 300,
      },
      "searchId": null,
      "searchUrl": null,
    },
  ],
  "mostRecentPrice": {
    "amountInMinorUnits": 300,
    "currencyCode": CurrencyCode.GBP,
  },
  buyItNowPrice: null,
  "listingUrl": "https://www.ebay.co.uk/itm/324625267195",
  "selectionIds": [],
  "searchIds": [
    "a31d7080-c517-4a63-866e-34876c39fbf1",
    "42094fb8-0509-4b05-b9cd-2d496ffea783",
    "61e2e0fc-c7e8-4fb5-8b33-1d82479956f3",
  ],
  "nextCheckTimestamp": TimestampStatic.now(),
  "imageUrls": [
    "https://i.ebayimg.com/images/g/aqwAAOSwYjJgn9NF/s-l500.jpg",
    "https://i.ebayimg.com/images/g/rlMAAOSwOLBgn9NG/s-l500.jpg",
  ],
  "condition": CardCondition.NEAR_MINT,
  "listingName": "Pokemon - Aegislash V - 126/185 - SWSH Vivid Voltage - Half Art",
  "listingId": "324625267195",
  "cardId": "c4cbb4b6-ceba-4b14-8e28-ad2b590ccd59",
  "historicalCardPriceId": null,
  "extendedInfoCheckedAt": TimestampStatic.now(),
  "mostRecentUpdate": TimestampStatic.now(),
  "id": "0034a631-6a5c-4bf3-bbe8-054e60a295b8",
  "listingMessage": "Bidding has ended on this item.  The seller has relisted this item or one like this.",
  "dateLastModified": TimestampStatic.now(),
  "listingTypes": [
    ListingType.BID,
  ],
  "mostRecentBidCount": 0,
  "sellersNotes": null,
}

const INTERVAL_MILLISECONDS = 5000

const retrieveFakeListings = async (limit:number):Promise<Array<EbayOpenListingEntity>> => {
  const from = moment().subtract(limit * INTERVAL_MILLISECONDS, 'milliseconds')
  const to = moment()
  const listings:Array<EbayOpenListingEntity> = []
  let time = from.clone()
  while (time.isBefore(to)) {
    const listing = Object.assign({}, SOURCE_LISTING)
    const startOfLastHour = time.clone().startOf('hour');
    const secondsSinceStartOfHour = time.diff(startOfLastHour, 'seconds')
    listing.mostRecentPrice = {
      currencyCode: CurrencyCode.GBP,
      amountInMinorUnits: secondsSinceStartOfHour,
    }
    listing.mostRecentUpdate = momentToTimestamp(time)
    listing.dateCreated = momentToTimestamp(time)
    listing.id = `${secondsSinceStartOfHour}`
    listings.push(listing)
    time = time.add(INTERVAL_MILLISECONDS, 'milliseconds')
  }
  return listings
}

export const fakeListingGenerator = {
  retrieveFakeListings,
}