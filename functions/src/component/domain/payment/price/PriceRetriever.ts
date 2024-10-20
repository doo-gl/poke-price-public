import {byIdRetriever} from "../../../database/ByIdRetriever";
import {singleResultRepoQuerier} from "../../../database/SingleResultRepoQuerier";
import {priceRepository} from "./PriceRepository";
import {PriceEntity} from "./PriceEntity";
import {batchIds} from "../../../database/BaseCrudRepository";
import {flattenArray} from "../../../tools/ArrayFlattener";
import {toInputValueMultiMap} from "../../../tools/MapBuilder";


const retrieve = (id:string):Promise<PriceEntity> => {
  return byIdRetriever.retrieve(priceRepository, id, priceRepository.collectionName);
}

const retrieveOptionalByStripePriceId = (stripePriceId:string):Promise<PriceEntity|null> => {
  return singleResultRepoQuerier.query(
    priceRepository,
    [{ name: "stripePriceId", value: stripePriceId }],
    priceRepository.collectionName
  )
}

const retrieveActiveByStripeProductIds = async (stripeProductIds:Array<string>):Promise<Map<string, Array<PriceEntity>>> => {
  const idBatches = batchIds(stripeProductIds);
  const batchedPrices = await Promise.all(
    idBatches.map(
      idBatch => priceRepository.getMany([
        { field: "productId", operation: "in", value: idBatch },
        { field: "active", operation: "==", value: true },
      ])
    )
  )
  const prices = flattenArray(batchedPrices);
  const productIdToPrices = toInputValueMultiMap(prices, price => price.productId);
  return productIdToPrices;
}

const retrieveActive = async (id:string):Promise<PriceEntity|null> => {
  return singleResultRepoQuerier.query(
    priceRepository,
    [
      { name: 'id', value: id },
      { name: 'active', value: true },
    ],
    priceRepository.collectionName
  )
}

export const priceRetriever = {
  retrieve,
  retrieveOptionalByStripePriceId,
  retrieveActiveByStripeProductIds,
  retrieveActive,
}