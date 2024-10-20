import {jsonToCsv} from "../../../external-lib/JsonToCsv";
import {ebayOpenListingRepository} from "./EbayOpenListingRepository";
import {SortOrder} from "../../../database/BaseCrudRepository";
import {momentToTimestamp, timestampToMoment} from "../../../tools/TimeConverter";
import moment from "moment/moment";
import {toSet} from "../../../tools/SetBuilder";
import {logger} from "firebase-functions";
import {toInputValueMap} from "../../../tools/MapBuilder";
import {fromCurrencyAmountLike, fromOptionalCurrencyAmountLike} from "../../money/CurrencyAmount";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {itemRetriever} from "../../item/ItemRetriever";
import {itemPriceQuerier} from "../../item/ItemPriceQuerier";


export interface ListingsEndingSoonRow {
  cardId:string,
  listingId:string,
  listingName:string,
  listingUrl:string,
  listingRedirectUrl:string,
  listingPartnerUrl:string
  listingTypes:string,
  listingEndTime:string|null,
  listingCreatedTime:string,
  buyingOpportunityScore:number|null,
  cardPrice:string|null,
  listingPrice:string|null,
  lastUpdatedListing:string,
}

const retrieveRows = async ():Promise<Array<ListingsEndingSoonRow>> => {
  // get the top 1000 listings endings soon
  // join the cards to them
  // output
  const listings = await ebayOpenListingRepository.getMany(
    [{ field: "listingEndTime", operation: ">=", value: momentToTimestamp(moment()) }],
    {
      limit: 1000,
      sort: [{ field: "listingEndTime", order: SortOrder.ASC }],
    }
  )
  if (listings.length === 0) {
    return []
  }
  const start = listings[0].listingEndTime ? timestampToMoment(listings[0].listingEndTime) : null
  // @ts-ignore
  const end = listings[listings.length - 1].listingEndTime ? timestampToMoment(listings[listings.length - 1].listingEndTime) : null
  logger.info(`Found ${listings.length} with end times from: ${start?.toISOString()} to ${end?.toISOString()}`)
  const cardIds = toSet(listings, listing => listing.cardId);
  logger.info(`Listings have ${cardIds.size} unique cards`)
  const items = await itemRetriever.retrieveManyByLegacyId([...cardIds]);
  const legacyItemIdIdToItem = toInputValueMap(items, item => item.legacyId);
  return listings
    .filter(listing => listing.mostRecentPrice.currencyCode === CurrencyCode.GBP)
    .map(listing => {
      const item = legacyItemIdIdToItem.get(listing.cardId) ?? null;
      const currentItemPrice = itemPriceQuerier.pokePrice(item)?.price ?? null
      return {
        cardId: listing.cardId,
        listingId: listing.id,
        listingName: listing.listingName,
        listingUrl: listing.listingUrl,
        listingRedirectUrl: `https://pokeprice.io/redirect/ebay?redirectUrl=${encodeURIComponent(listing.listingUrl)}`,
        listingPartnerUrl: `${listing.listingUrl}?campid=5338795757&customid=link&mkcid=1&mkevt=1&mkrid=710-53481-19255-0&siteid=3&toolid=10001`,
        listingTypes: listing.listingTypes.join('|'),
        listingEndTime: listing?.listingEndTime?.toDate().toISOString() ?? null,
        listingCreatedTime: listing.dateCreated.toDate().toISOString(),
        buyingOpportunityScore: listing.buyingOpportunity?.score ?? null,
        cardPrice: fromOptionalCurrencyAmountLike(currentItemPrice)?.toString() ?? null,
        listingPrice: fromCurrencyAmountLike(listing.mostRecentPrice).toString(),
        lastUpdatedListing: timestampToMoment(listing.mostRecentUpdate).toISOString(),
      }
    })
}

const retrieve = async ():Promise<string> => {
  const rows = await retrieveRows()
  return jsonToCsv.parse(rows);
}

export const listingsEndingSoonCsvRetriever = {
  retrieve,
}