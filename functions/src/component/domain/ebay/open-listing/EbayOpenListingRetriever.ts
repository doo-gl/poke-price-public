import {singleResultRepoQuerier} from "../../../database/SingleResultRepoQuerier";
import {ebayOpenListingRepository} from "./EbayOpenListingRepository";
import {EbayOpenListingEntity, ListingState} from "./EbayOpenListingEntity";
import {byIdRetriever} from "../../../database/ByIdRetriever";
import {batchIds, SortOrder} from "../../../database/BaseCrudRepository";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {CardCondition} from "../../historical-card-price/CardCondition";
import moment, {Moment} from "moment/moment";
import {momentToTimestamp} from "../../../tools/TimeConverter";
import {flattenArray} from "../../../tools/ArrayFlattener";
import {dedupe} from "../../../tools/ArrayDeduper";


const retrieveByListingId = (ebayListingId:string) => {
  return singleResultRepoQuerier.query(
    ebayOpenListingRepository,
    [ {name: "listingId", value: ebayListingId} ],
    ebayOpenListingRepository.collectionName,
  );
}

const retrieveByListingIds = async (ebayListingIds:Array<string>):Promise<Array<EbayOpenListingEntity>> => {
  const idBatches = batchIds(ebayListingIds);
  const results = await Promise.all(idBatches.map(idBatch => {
    return ebayOpenListingRepository.getMany([{
      field: "listingId", operation: "in", value: idBatch,
    }])
  }))
  return flattenArray(results)
}

const retrieveByCardIdAndListingIds = async (cardId:string, ebayListingIds:Array<string>):Promise<Array<EbayOpenListingEntity>> => {
  const batchedIds = batchIds(ebayListingIds)
  const resultArrays = await Promise.all(batchedIds.map(listingIdBatch => ebayOpenListingRepository.getMany([
    { field: "cardId", operation: "==", value: cardId },
    { field: "listingId", operation: "in", value: listingIdBatch },
  ])))
  const results = flattenArray(resultArrays)
  const dedupedResults = dedupe(results, i => i.id)
  return dedupedResults
}

const retrieve = (id:string):Promise<EbayOpenListingEntity> => {
  return byIdRetriever.retrieve(ebayOpenListingRepository, id, ebayOpenListingRepository.collectionName);
}

const retrieveOptional = (id:string):Promise<EbayOpenListingEntity|null> => {
  return ebayOpenListingRepository.getOne(id)
}

const retrieveOpenByNextCheckTimeASC = (limit:number):Promise<Array<EbayOpenListingEntity>> => {
  return ebayOpenListingRepository.getMany(
    [{ field: "state", operation: "==", value: ListingState.OPEN }],
    {
      sort: [{ field: "nextCheckTimestamp", order: SortOrder.ASC }],
      limit,
    }
  )
}

const retrieveForCardId = (cardId:string):Promise<Array<EbayOpenListingEntity>> => {
  return ebayOpenListingRepository.getMany([
    { field: "cardId", operation: "==", value: cardId },
  ])
}

const retrieveOpenForCardId = (cardId:string):Promise<Array<EbayOpenListingEntity>> => {
  return ebayOpenListingRepository.getMany([
    { field: "cardId", operation: "==", value: cardId },
    { field: "state", operation: "==", value: ListingState.OPEN },
  ])
}

const retrieveAllCurrentlyOpen = (cardId:string, searchId:string, currencyCode:CurrencyCode):Promise<Array<EbayOpenListingEntity>> => {
  return ebayOpenListingRepository.getMany([
    { field: "cardId", operation: "==", value: cardId },
    { field: "searchIds", operation: "array-contains", value: searchId },
    { field: "state", operation: "==", value: ListingState.OPEN },
    { field: "condition", operation: "==", value: CardCondition.NEAR_MINT },
    { field: "mostRecentPrice.currencyCode", operation: "==", value: currencyCode },
  ]);
}

const retrieveFromIdByDateCreatedAsc = (fromId:string, limit:number):Promise<Array<EbayOpenListingEntity>> => {
  return ebayOpenListingRepository.getMany(
    [],
    {
      limit,
      sort: [{ field: "dateCreated", order: SortOrder.ASC }],
      startAfterId: fromId,
    }
  )
}

const retrieveFirstCreatedAfterDate = async (from:Moment):Promise<EbayOpenListingEntity|null> => {
  const listings = await ebayOpenListingRepository.getMany(
    [ {field: "dateCreated", operation: ">=", value: momentToTimestamp(from)} ],
    {
      limit: 1,
      sort: [{ field: "dateCreated", order: SortOrder.ASC }],
    }
  )
  if (listings.length === 0) {
    return null
  } else {
    return listings[0]
  }
}

const retrievePricesCreatedBeforeId = (id:string, limit:number):Promise<Array<EbayOpenListingEntity>> => {
  return ebayOpenListingRepository.getMany(
    [],
    {
      limit,
      sort: [{ field: "dateCreated", order: SortOrder.DESC }],
      startAfterId: id,
    }
  )
}

const listingExists = async (searchParamId:string, condition:CardCondition, currencyCode:CurrencyCode):Promise<boolean> => {
  const listings = await ebayOpenListingRepository.getMany(
    [
      { field: "condition", operation: "==", value: condition },
      { field: "mostRecentPrice.currencyCode", operation: "==", value: currencyCode },
      { field: "searchIds", operation: "array-contains", value: searchParamId },
    ],
    { limit: 1 }
  );
  return listings.length > 0;
}

const retrieveBySelectionId = (selectionId:string) => {
  return ebayOpenListingRepository.getMany([
    { field: "selectionIds", operation: "array-contains", value: selectionId },
  ])
}

const retrieveOpenByCardIdAndBySearchId = (cardId:string, searchId:string) => {
  return ebayOpenListingRepository.getMany([
    { field: "cardId", operation: "==", value: cardId },
    { field: "searchIds", operation: "array-contains", value: searchId },
    { field: "state", operation: "==", value: ListingState.OPEN },
  ])
}

const retrieveOpenByCardId = (cardId:string) => {
  return ebayOpenListingRepository.getMany([
    { field: "cardId", operation: "==", value: cardId },
    { field: "state", operation: "==", value: ListingState.OPEN },
  ])
}

const retrieveByIds = (ids:Array<string>):Promise<Array<EbayOpenListingEntity>> => {
  return ebayOpenListingRepository.getManyById(ids);
}

const retrieveTopByBuyingOpportunityScore = (limit:number):Promise<Array<EbayOpenListingEntity>> => {
  return ebayOpenListingRepository.getMany(
    [],
    {
      sort: [{ field: "buyingOpportunity.score", order: SortOrder.DESC }],
      limit,
    }
  )
}

const retrieveByPriceIds = (ids:Array<string>):Promise<Array<EbayOpenListingEntity>> => {
  return ebayOpenListingRepository.getMany([
    {field: "historicalCardPriceId", operation: "in", value: ids},
  ])
}

export const ebayOpenListingRetriever = {
  retrieve,
  retrieveOptional,
  retrieveByCardIdAndListingIds,
  retrieveByListingId,
  retrieveByListingIds,
  retrieveOpenByNextCheckTimeASC,
  retrieveForCardId,
  retrieveFromIdByDateCreatedAsc,
  retrieveFirstCreatedAfterDate,
  retrievePricesCreatedBeforeId,
  retrieveAllCurrentlyOpen,
  listingExists,
  retrieveBySelectionId,
  retrieveOpenByCardIdAndBySearchId,
  retrieveOpenByCardId,
  retrieveByIds,
  retrieveTopByBuyingOpportunityScore,
  retrieveOpenForCardId,
  retrieveByPriceIds,
}