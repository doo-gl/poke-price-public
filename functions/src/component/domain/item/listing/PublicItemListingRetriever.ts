import {itemListingMapper, PublicItemListingDto} from "./ItemListingMapper";
import {ebayOpenListingRetriever} from "../../ebay/open-listing/EbayOpenListingRetriever";
import {cardItemRetriever} from "../CardItemRetriever";
import {currencyExchanger} from "../../money/CurrencyExchanger";


const retrieveById = async (listingId:string):Promise<PublicItemListingDto> => {
  const listing = await ebayOpenListingRetriever.retrieve(listingId);
  const item = await cardItemRetriever.retrieve(listing.cardId)
  const exchanger = await currencyExchanger.buildExchanger(listing.mostRecentPrice.currencyCode)
  return itemListingMapper.mapEbayOpenListingToDto(listing, item, exchanger);
}

export const publicItemListingRetriever = {
  retrieveById,
}