import {byIdRetriever} from "../../../database/ByIdRetriever";
import {singleResultRepoQuerier} from "../../../database/SingleResultRepoQuerier";
import {TaxRateEntity} from "./TaxRateEntity";
import {taxRateRepository} from "./TaxRateRepository";

const retrieve = (id:string):Promise<TaxRateEntity> => {
  return byIdRetriever.retrieve(taxRateRepository, id, taxRateRepository.collectionName);
}

const retrieveOptionalByStripeTaxRateId = (stripeTaxRateId:string):Promise<TaxRateEntity|null> => {
  return singleResultRepoQuerier.query(
    taxRateRepository,
    [{ name: "stripeTaxRateId", value: stripeTaxRateId }],
    taxRateRepository.collectionName
  )
}

export const taxRateRetriever = {
  retrieve,
  retrieveOptionalByStripeTaxRateId,
}