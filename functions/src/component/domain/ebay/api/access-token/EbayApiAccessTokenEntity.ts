import {Entity} from "../../../../database/Entity";
import {repositoryFactory} from "../../../../database/RepositoryFactory";
import {Timestamp} from "../../../../external-lib/Firebase";

const COLLECTION_NAME = 'ebay-api-access-token'

export interface EbayApiAccessTokenEntity extends Entity {
  token:string,
  expiresIn:number,
  tokenType:string,
  expiresAt:Timestamp,
}

const result = repositoryFactory.build<EbayApiAccessTokenEntity>(COLLECTION_NAME);
export const ebayApiAccessTokenRepository = result.repository;
export const ebayApiAccessTokenCreator = result.creator;
export const ebayApiAccessTokenUpdater = result.updater;
export const ebayApiAccessTokenDeleter = result.deleter;