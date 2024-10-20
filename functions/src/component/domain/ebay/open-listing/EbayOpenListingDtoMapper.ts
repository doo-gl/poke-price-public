import {BuyingOpportunity, EbayOpenListingEntity, OpenListingHistory} from "./EbayOpenListingEntity";
import {EbayOpenListingDto, OpenListingHistory as OpenListingHistoryDto, BuyingOpportunity as BuyingOpportunityDto} from "./EbayOpenListingDto";
import {entityDtoMapper} from "../../EntityDtoMapper";
import {timestampToMoment} from "../../../tools/TimeConverter";

const mapHistory = (history:Array<OpenListingHistory>):Array<OpenListingHistoryDto> => {
  return history.map(historyItem => {
    return {
      price: historyItem.price,
      searchUrl: historyItem.searchUrl,
      searchId: historyItem.searchId,
      bidCount: historyItem.bidCount,
      timestamp: timestampToMoment(historyItem.timestamp).toISOString(),
    }
  })
}

const mapBuyingOpportunity = (opportunity:BuyingOpportunity|null):BuyingOpportunityDto|null => {
  if (!opportunity) {
    return null;
  }
  return {
    listingEnds: opportunity.listingEnds ? timestampToMoment(opportunity.listingEnds).toISOString() : null,
    canBuyNow: opportunity.canBuyNow,
    score: opportunity.score,
    scoreParts: opportunity.scoreParts,
    soldPrice: opportunity.soldPrice,
    soldVolume: opportunity.soldVolume,
    soldMinPrice: opportunity.soldMinPrice,
    soldLowPrice: opportunity.soldLowPrice,
    currentListingPrice: opportunity.currentListingPrice,
  }
}

const map = (entity:EbayOpenListingEntity):EbayOpenListingDto => {
  return {
    ...entityDtoMapper.map(entity),
    cardId: entity.cardId,
    historicalCardPriceId: entity.historicalCardPriceId,
    searchIds: entity.searchIds,
    mostRecentPrice: entity.mostRecentPrice,
    mostRecentBidCount: entity.mostRecentBidCount,
    mostRecentUpdate: timestampToMoment(entity.mostRecentUpdate).toISOString(),
    history: mapHistory(entity.history),
    listingTypes: entity.listingTypes,
    listingName: entity.listingName,
    listingEndTime: entity.listingEndTime ? timestampToMoment(entity.listingEndTime).toISOString() : null,
    listingUrl: entity.listingUrl,
    listingId: entity.listingId,
    imageUrls: entity.imageUrls,
    buyingOpportunity: mapBuyingOpportunity(entity.buyingOpportunity),
    state: entity.state,
    unknownDetails: entity.unknownDetails,
    listingMessage: entity.listingMessage,
    nextCheckTimestamp: timestampToMoment(entity.nextCheckTimestamp).toISOString(),
  }
}

export const ebayOpenListingDtoMapper = {
  map,
}