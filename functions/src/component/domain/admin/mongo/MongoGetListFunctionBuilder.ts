import {EntityDto} from "../../EntityDto";
import {MongoEntity} from "../../../database/mongo/MongoEntity";
import {MongoBaseCrudRepository} from "../../../database/mongo/MongoBaseCrudRepository";
import {GetManyRequestV2, Query, SortDirection} from "../GetManyRequest";
import {FindOptions, ObjectId} from "mongodb";
import {PagingMetadata} from "../../PagingResults";

export interface ResultList<T> {
  results:Array<T>
  paging:PagingMetadata
}

const queryForFilter = async <ENT extends MongoEntity, DTO extends EntityDto>(
  repository:MongoBaseCrudRepository<ENT>,
  request:GetManyRequestV2<DTO>
):Promise<ResultList<ENT>> => {


  const pageSize = request.pageSize || 40;
  const pageIndex = request.pageIndex || 0;
  let sort:any = null;
  if (request.sortField) {
    const sortField = request.sortField === "id" ? "_id" : request.sortField
    const sortDirection = request.sortDirection || SortDirection.ASC;
    sort = {};
    sort[sortField] = sortDirection === SortDirection.ASC ? 1 : -1
  }
  const findOptions:FindOptions<ENT> = {
    limit: pageSize,
    skip: pageSize * pageIndex,
    sort,
  };

  const queries:Array<Query<ENT>> = request.queries;
  const filter:any = {};
  queries.forEach(query => {
    if (query.operation === "eq") {
      if (query.field === "_id" && ObjectId.isValid(query.value)) {
        filter[query.field] = new ObjectId(query.value);
      } else {
        filter[query.field] = query.value;
      }
    }
    if (query.operation === "gt") {
      filter[query.field] = {$gt: query.value};
    }
    if (query.operation === "ge") {
      filter[query.field] = {$gte: query.value};
    }
    if (query.operation === "lt") {
      filter[query.field] = {$lt: query.value};
    }
    if (query.operation === "le") {
      filter[query.field] = {lte: query.value};
    }
  })

  const results = await Promise.all([
    repository.getMany(filter, findOptions),
    repository.count(filter),
  ])

  return {
    results: results[0],
    paging: {pageIndex, pageSize, count: results[1]},
  };
}

const build = <ENT extends MongoEntity, DTO extends EntityDto>(
  repository:MongoBaseCrudRepository<ENT>,
  resultMapper:(entity:ENT) => DTO,
):(request:GetManyRequestV2<ENT>) => Promise<ResultList<DTO>> => {

  return async (request:GetManyRequestV2<ENT>) => {

    if (request.ids && request.ids.length > 0) {
      const entities = await repository.getManyByMaybeLegacyIds(request.ids);
      return {
        results: entities.map(resultMapper),
        paging: {pageIndex: 0, pageSize: entities.length, count: entities.length},
      }
    } else {
      const resultEntityList = await queryForFilter(repository, request);
      return {
        results: resultEntityList.results.map(resultMapper),
        paging: resultEntityList.paging,
      }
    }
  }

}

export const mongoGetListFunctionBuilder = {
  build,
}