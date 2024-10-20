import {Entity} from "../../../database/Entity";
import {Timestamp} from "../../../external-lib/Firebase";
import {repositoryFactory} from "../../../database/RepositoryFactory";

const COLLECTION_NAME = 'card-query-view-count';

export interface CardQueryViewCountEntity extends Entity {

  key:string,
  tags:Array<{name:string,value:string}>,
  tagKeys:Array<string>,
  date:Timestamp,
  count:number,

}

const result = repositoryFactory.build<CardQueryViewCountEntity>(COLLECTION_NAME);
export const cardQueryViewCountRepository = result.repository;
export const cardQueryViewCountCreator = result.creator;
export const cardQueryViewCountUpdater = result.updater;