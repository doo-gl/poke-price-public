import {EbayCardSearchParamEntity} from "./EbayCardSearchParamEntity";
import {UniqueSet} from "../../set/UniqueSet";
import {ebayCardSearchParamRepository} from "./EbayCardSearchParamRepository";
import {byIdRetriever} from "../../../database/ByIdRetriever";
import {batchIds, SortOrder} from "../../../database/BaseCrudRepository";
import {flattenArray} from "../../../tools/ArrayFlattener";


const retrieve = (id:string):Promise<EbayCardSearchParamEntity> => {
  return byIdRetriever.retrieve(
    ebayCardSearchParamRepository,
    id,
    'ebay card search param'
  );
}

const retrieveSearchParamsForCardId = (cardId:string):Promise<Array<EbayCardSearchParamEntity>> => {
  return ebayCardSearchParamRepository.getMany([
    { field: "cardId", operation: "==", value: cardId },
    { field: "active", operation: "==", value: true },
  ]);
}

const retrieveSearchParamsForItemId = (itemId:string):Promise<Array<EbayCardSearchParamEntity>> => {
  return ebayCardSearchParamRepository.getMany([
    { field: "itemId", operation: "==", value: itemId },
    { field: "active", operation: "==", value: true },
  ]);
}

const retrieveSearchParamForItemId = async (itemId:string):Promise<EbayCardSearchParamEntity|null> => {
  const params = await ebayCardSearchParamRepository.getMany([
    { field: "itemId", operation: "==", value: itemId },
    { field: "active", operation: "==", value: true },
  ]);
  if (params.length === 0) {
    return null
  }
  return params[0]
}

const retrieveSearchParamForCardId = async (cardId:string):Promise<EbayCardSearchParamEntity|null> => {
  const params = await ebayCardSearchParamRepository.getMany([
    { field: "cardId", operation: "==", value: cardId },
    { field: "active", operation: "==", value: true },
  ]);
  if (params.length === 0) {
    return null
  }
  return params[0]
}

const retrieveSearchParamForItemIdOrCardId = async (id:string):Promise<EbayCardSearchParamEntity|null> => {
  const byItemId = await retrieveSearchParamForItemId(id)
  if (byItemId) {
    return byItemId
  }
  return await retrieveSearchParamForCardId(id)
}

const retrieveSearchParamsForItemIdOrCardId = async (id:string):Promise<Array<EbayCardSearchParamEntity>> => {
  const byItemId = await retrieveSearchParamsForItemId(id)
  if (byItemId.length > 0) {
    return byItemId
  }
  return await retrieveSearchParamsForCardId(id)
}

const retrieveSearchParamsForCardIds = async (cardIds:Array<string>):Promise<Array<EbayCardSearchParamEntity>> => {
  const cardIdBatches = batchIds(cardIds)
  const paramBatches = await Promise.all(
    cardIdBatches.map(cardIdBatch => {
      return ebayCardSearchParamRepository.getMany([
        { field: "cardId", operation: "in", value: cardIdBatch },
        { field: "active", operation: "==", value: true },
      ]);
    })
  )
  return flattenArray(paramBatches)
}

const retrieveSearchParamsForSet = (setKey:UniqueSet):Promise<Array<EbayCardSearchParamEntity>> => {
  return ebayCardSearchParamRepository.getMany([
    { field: "series", operation: "==", value: setKey.series },
    { field: "set", operation: "==", value: setKey.set },
  ]);
}

const retrieveByLastReconciledAsc = (limit:number):Promise<Array<EbayCardSearchParamEntity>> => {
  return ebayCardSearchParamRepository.getMany(
  [{ field: "active", operation: "==", value: true }],
  { sort: [{ field: "lastReconciled", order: SortOrder.ASC }], limit }
  )
}

export const ebaySearchParamRetriever = {
  retrieve,
  retrieveSearchParamsForCardId,
  retrieveSearchParamsForItemId,
  retrieveSearchParamForItemId,
  retrieveSearchParamForCardId,
  retrieveSearchParamsForCardIds,
  retrieveSearchParamForItemIdOrCardId,
  retrieveSearchParamsForItemIdOrCardId,
  retrieveSearchParamsForSet,
  retrieveByLastReconciledAsc,
}