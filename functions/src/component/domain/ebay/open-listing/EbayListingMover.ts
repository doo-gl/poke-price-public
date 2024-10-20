import {ebayOpenListingRepository} from "./EbayOpenListingRepository";
import {EbayOpenListingEntity} from "./EbayOpenListingEntity";
import {BatchUpdate} from "../../../database/BaseCrudRepository";
import {HistoricalCardPriceEntity} from "../../historical-card-price/HistoricalCardPriceEntity";
import {historicalCardPriceRepository} from "../../historical-card-price/HistoricalCardPriceRepository";
import {logger} from "firebase-functions";
import {ebayCardSearchParamCreator} from "../search-param/EbayCardSearchParamCreator";
import {searchParamValidator} from "../search-param/SearchParamValidator";
import {ebayOpenListingRetriever} from "./EbayOpenListingRetriever";

export interface CardIdMapping {
  original:string,
  new:string
}

const map = async (mapping:CardIdMapping) => {
  logger.info(`Mapping: ${mapping.original} to ${mapping.new}`)


  const listings = await ebayOpenListingRetriever.retrieveForCardId(mapping.original)
  const newCardSearchParams = await ebayCardSearchParamCreator.getOrCreateSearchParams(mapping.new)

  const listingsToMove = listings.filter(listing => {
    const validation = searchParamValidator.validate(newCardSearchParams, listing.listingName)
    return validation.isValid
  })

  await move(mapping.new, listingsToMove)

}

const move = async (toCardId:string, listings:Array<EbayOpenListingEntity>):Promise<void> => {

  const listingUpdates:Array<BatchUpdate<EbayOpenListingEntity>> = []
  const priceUpdates:Array<BatchUpdate<HistoricalCardPriceEntity>> = []
  listings.forEach(listing => {
    listingUpdates.push({
      id: listing.id,
      update: { cardId: toCardId },
    })
    if (listing.historicalCardPriceId) {
      priceUpdates.push({
        id: listing.historicalCardPriceId,
        update: { cardId: toCardId },
      })
    }
  })
  await ebayOpenListingRepository.batchUpdate(listingUpdates)
  await historicalCardPriceRepository.batchUpdate(priceUpdates)

}

export const ebayListingMover = {
  move,
  map,
}