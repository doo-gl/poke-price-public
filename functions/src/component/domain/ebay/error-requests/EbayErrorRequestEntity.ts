import {Entity} from "../../../database/Entity";
import {repositoryFactory} from "../../../database/RepositoryFactory";

const COLLECTION_NAME = 'ebay-error-request'

export interface EbayErrorRequestEntity extends Entity {
  url:string,
  status:number|null,
  body:string,
  headers:any,
}

const result = repositoryFactory.build<EbayErrorRequestEntity>(COLLECTION_NAME);
export const ebayErrorRequestRepository = result.repository;
export const baseEbayErrorRequestCreator = result.creator;
export const baseEbayErrorRequestUpdater = result.updater;
export const baseEbayErrorRequestDeleter = result.deleter;