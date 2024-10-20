import {Entity} from "../../../database/Entity";
import {repositoryFactory} from "../../../database/RepositoryFactory";

const COLLECTION_NAME = 'card-query-metadata';

export interface CardQueryMetadataValue {
  value:string,
  label:string,
}

export interface CardQueryMetadataEntity extends Entity {

  key:string,
  keyLabel:string,
  values:Array<CardQueryMetadataValue>,

}

const result = repositoryFactory.build<CardQueryMetadataEntity>(COLLECTION_NAME);
export const cardQueryMetadataRepository = result.repository;
export const cardQueryMetadataCreator = result.creator;
export const cardQueryMetadataUpdater = result.updater;