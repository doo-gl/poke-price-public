import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {FirestoreBaseCrudRepository, Query, QueryOptions, Sort, SortOrder} from "../../database/BaseCrudRepository";
import {Entity} from "../../database/Entity";
import {GetManyRequest} from "./GetManyRequest";
import {EntityDto} from "../EntityDto";

export interface ResultList<T> {
  results:Array<T>
}

const queryForFilter = async <ENT extends Entity, DTO extends EntityDto>(
  repository:FirestoreBaseCrudRepository<ENT>,
  request:GetManyRequest<DTO>
):Promise<Array<ENT>> => {

  const sort:Array<Sort<ENT>>|undefined = request.sortField
    ? [ { field: request.sortField, order: SortOrder[request.sortDirection] } ]
    : undefined;

  const queryOptions:QueryOptions<ENT> = {
    limit: request.pageSize,
    sort,
  }

  if (request.startAfterId) {
    queryOptions.startAfterId = request.startAfterId;
  }
  if (request.endAtId) {
    // if using end at, query in reverse order to the one requested, and go backwards through the results.
    // then reverse the returned results
    // this will give the effect of having queried up to the requested id.
    queryOptions.startAtId = request.endAtId;
    const order = queryOptions.sort![0].order
    queryOptions.sort![0].order = order === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC;
  }

  const query:Array<Query<ENT>> = request.queries;
  let results:Array<ENT> = await repository.getMany(query, queryOptions);

  if (request.endAtId) {
    // see comment above about querying in reverse order
    results = results.reverse()
  }
  return results;
}

const build = <ENT extends Entity, DTO extends EntityDto>(
  repository:FirestoreBaseCrudRepository<ENT>,
  resultMapper:(entity:ENT) => DTO,
):(request:GetManyRequest<ENT>) => Promise<ResultList<DTO>> => {

  return async (request:GetManyRequest<ENT>) => {
    if (request.startAfterId && request.endAtId) {
      throw new InvalidArgumentError(`Cannot specify both startAfterId and endAtId`);
    }

    let results:Array<ENT>;
    if (request.ids && request.ids.length > 0) {
      results = await repository.getManyById(request.ids);
    } else {
      results = await queryForFilter(repository, request);
    }

    return {
      results: results.map(result => resultMapper(result)),
    };
  }

}

export const getListFunctionBuilder = {
  build,
}