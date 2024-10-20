import {BaseCrudRepository, FirestoreBaseCrudRepository, Query, Sort, SortOrder} from "./BaseCrudRepository";
import {logger} from "firebase-functions";
import {Entity} from "./Entity";
import {NotFoundError} from "../error/NotFoundError";
import {duplicateEntityCleaner} from "./duplicate-result-cleaner/DuplicateEntityCleaner";
import {comparatorBuilder} from "../infrastructure/ComparatorBuilder";

export type EntityQueryParam<T extends Entity> = {
  name:Extract<keyof T, string>|string,
  value:any,
}
const BY_DATE_CREATED_ASC = comparatorBuilder.objectAttributeASC<Entity, number>(ent => ent.dateCreated.toMillis());
const query = async <T extends Entity>(repo:FirestoreBaseCrudRepository<T>, queryParams:Array<EntityQueryParam<T>>, singularDataName:string):Promise<T|null> => {
  const queries:Array<Query<T>> = queryParams.map(queryParam => {
    return { field: queryParam.name, operation: "==", value: queryParam.value };
  })
  const results:Array<T> = await repo.getMany(queries);
  const sortedResults = results.sort(BY_DATE_CREATED_ASC)
  if (sortedResults.length === 0) {
    return Promise.resolve(null);
  }
  if (sortedResults.length > 1) {
    const entityIds = sortedResults.map(entity => entity.id);
    const fields = queryParams.map(queryParam => `${queryParam.name}=${queryParam.value}`).join('&');
    logger.error(
      `Found ${sortedResults.length} results when looking for a ${singularDataName} with params: ${fields}, expected to find 1, only returning the first.
      Actual results: ${entityIds.join(',')}`
    );
    await duplicateEntityCleaner.addEntityToClean(repo.collectionName, entityIds);
  }
  return sortedResults[0];
}

const queryOrThrow = async <T extends Entity>(repo:FirestoreBaseCrudRepository<T>, queryParams:Array<EntityQueryParam<T>>, singularDataName:string):Promise<T> => {
  const entity = await query<T>(repo, queryParams, singularDataName);
  if (!entity) {
    const fields = queryParams.map(queryParam => `${queryParam.name}=${queryParam.value}`).join('&');
    throw new NotFoundError(`Failed to find ${singularDataName} for params: ${fields}`);
  }
  return entity;
}

export const singleResultRepoQuerier = {
  query,
  queryOrThrow,
}