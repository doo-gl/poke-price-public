import {ExchangeRateEntity} from "./ExchangeRateEntity";
import {singleResultRepoQuerier} from "../../database/SingleResultRepoQuerier";
import {exchangeRateRepository} from "./ExchangeRateRepository";
import {batchArray} from "../../tools/ArrayBatcher";
import {flattenArray} from "../../tools/ArrayFlattener";

const retrieveByKey = (key:string):Promise<ExchangeRateEntity|null> => {
  return singleResultRepoQuerier.query(
    exchangeRateRepository,
    [ {name: "key", value: key} ],
    exchangeRateRepository.collectionName
  );
}

const retrieveByKeys = async (keys:Array<string>):Promise<Array<ExchangeRateEntity>> => {
  const batchedKeys = batchArray(keys, 30)
  const fetchedEntities = await Promise.all(batchedKeys.map(keyBatch => exchangeRateRepository.getMany([
    {field: "key", operation: "in", value: keyBatch},
  ])))
  return flattenArray(fetchedEntities)
}

export const exchangeRateRetriever = {
  retrieveByKey,
  retrieveByKeys,
}