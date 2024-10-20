import {Entity} from "../../database/Entity";
import {repositoryFactory} from "../../database/RepositoryFactory";
import {Timestamp} from "../../external-lib/Firebase";

const COLLECTION_NAME = 'archived-data'

export interface ArchivedDataEntity extends Entity {

  collectionName:string,
  numberOfEntities:number,
  filePath:string|null,
  metadata:any,
  entitiesArchivedAt:Timestamp|null

}


const result = repositoryFactory.build<ArchivedDataEntity>(COLLECTION_NAME);
export const archivedDataRepository = result.repository;
export const archivedDataCreator = result.creator;
export const archivedDataUpdater = result.updater;
export const archivedDataDeleter = result.deleter;