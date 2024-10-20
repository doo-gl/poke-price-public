import {ProductEntity} from "./ProductEntity";
import {byIdRetriever} from "../../../database/ByIdRetriever";
import {productRepository} from "./ProductRepository";
import {singleResultRepoQuerier} from "../../../database/SingleResultRepoQuerier";
import {batchIds} from "../../../database/BaseCrudRepository";
import {flattenArray} from "../../../tools/ArrayFlattener";
import {lodash} from "../../../external-lib/Lodash";


const retrieve = (id:string):Promise<ProductEntity> => {
  return byIdRetriever.retrieve(productRepository, id, productRepository.collectionName);
}

const retrieveOptionalByStripeProductId = (stripeProductId:string):Promise<ProductEntity|null> => {
  return singleResultRepoQuerier.query(
    productRepository,
    [{ name: "stripeProductId", value: stripeProductId }],
    productRepository.collectionName
  )
}

const retrieveByStripeProductIds = async (stripeProductIds:Array<string>):Promise<Array<ProductEntity>> => {
  const idBatches = batchIds(stripeProductIds);
  const resultBatches:Array<Array<ProductEntity>> = await Promise.all(
    idBatches.map((idBatch) => productRepository.getMany([{ field: "stripeProductId", operation: "in", value: idBatch }])),
  );
  const results = flattenArray(resultBatches);
  return lodash.uniq(results);
}

const retrieveByIds = (ids:Array<string>):Promise<Array<ProductEntity>> => {
  return productRepository.getManyById(ids);
}

const retrieveActive = ():Promise<Array<ProductEntity>> => {
  return productRepository.getMany([
    { field: "active", operation: "==", value: true },
  ]);
}

export const productRetriever = {
  retrieve,
  retrieveOptionalByStripeProductId,
  retrieveByStripeProductIds,
  retrieveByIds,
  retrieveActive,
}