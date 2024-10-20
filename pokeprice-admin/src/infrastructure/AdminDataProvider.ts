
import {
  CreateParams,
  CreateResult, DeleteManyParams, DeleteManyResult, DeleteParams, DeleteResult,
  GetListParams,
  GetListResult, GetManyParams, GetManyReferenceParams, GetManyReferenceResult, GetManyResult,
  GetOneParams,
  GetOneResult,
  Record, UpdateManyParams, UpdateManyResult, UpdateParams, UpdateResult
} from "ra-core";
import axios from "axios";
import { DataProvider, Identifier } from 'react-admin';
import * as queryString from 'query-string';
import {configRetriever} from "./ConfigRetriever";
import {dotObject} from "../external-lib/DotObject";
import {comparatorBuilder} from "../common/ComparatorBuilder";
import {authorizedClient} from "./AuthorizedClient";
import {lodash} from "../external-lib/Lodash";
import {flattenArray} from "../common/ArrayFlattener";

const isNotReservedFilterKey = (key:string):boolean => {
  return key !== 'startAfterId'
    && key !== 'endAtId'
    && key !== 'pageIndex'
    && key !== 'pageSize'
    && key !== 'sortField'
    && key !== 'sortDirection'
    && key !== 'ids'
    && key !== 'basicAuth'
}

const mapFiltersToQueryFields = (filter:any) => {
  const result:any = {};
  const transformedFilter = dotObject.dot(filter);
  Object.entries(transformedFilter)
    .forEach((entry) => {
    const key = entry[0];
    const value = entry[1];
    if (isNotReservedFilterKey(key)) {
      result[key] = JSON.stringify({ 'eq': value })
    } else {
      result[key] = value;
    }

  })
  return result;
}



export const adminDataProvider = (apiRoot:string):DataProvider => {

  const getList = async <RecordType extends Record = Record>(resource: string, params: GetListParams):Promise<GetListResult<RecordType>> => {
    const pageIndex = params.pagination.page - 1;
    const pageSize = params.pagination.perPage;
    // intentionally uses sort in the filter rather than params.sort
    // to avoid firebase throwing a fit every time you sort by a field
    const sortField = params.filter.sortField;
    const sortDirection = params.filter.sortDirection;
    const queryFields = mapFiltersToQueryFields(params.filter);
    const query = queryString.stringify({
      pageIndex,
      pageSize,
      sortField,
      sortDirection,
      ...queryFields
    })
    const response = await authorizedClient.get<RecordType>(`${apiRoot}/${resource}?${query}`);
    const results = response.data.results;
    const resultSortField = params.sort.field;
    const resultSortOrder = params.sort.order;
    const attributeMapper = (record:RecordType) => record[resultSortField];
    const comparator = resultSortOrder === 'ASC'
      ? comparatorBuilder.objectAttributeASC(attributeMapper)
      : comparatorBuilder.objectAttributeDESC(attributeMapper);
    const sortedResults = results.sort(comparator);
    const total = response.data?.paging?.count ?? 1000;
    return {
      data: sortedResults,
      total,
    }
  };

  const getOne = async <RecordType extends Record = Record>(resource: string, params: GetOneParams):Promise<GetOneResult<RecordType>> => {
    const response = await authorizedClient.get<RecordType>(`${apiRoot}/${resource}/${params.id}`);
    return Promise.resolve({data: response.data});
  }

  const getMany = async <RecordType extends Record = Record>(resource: string, params: GetManyParams):Promise<GetManyResult<RecordType>> => {
    const ids = params.ids;
    const idBatches:Array<Array<Identifier>> = [];
    let idBatch:Array<Identifier> = [];
    ids.forEach(id => {
      idBatch.push(id);
      if (idBatch.length > 100) {
        idBatches.push(idBatch);
        idBatch = [];
      }
    })
    if (idBatch.length > 0) {
      idBatches.push(idBatch);
    }
    const responses = await Promise.all(
      idBatches.map(batch => {
        const query = queryString.stringify({ids: batch})
        return authorizedClient.get<RecordType>(`${apiRoot}/${resource}?${query}`);
      })
    );
    const results = flattenArray(
      responses.map(response => response.data.results)
    )
    return {
      // @ts-ignore
      data: results
    }
  }

  const getManyReference = async <RecordType extends Record = Record>(resource: string, params: GetManyReferenceParams):Promise<GetManyReferenceResult<RecordType>> => {
    const pageSize = params.pagination.perPage;
    const sortField = params.sort.field;
    const sortDirection = params.sort.order;
    const filter = {
      ...params.filter,
    }
    filter[params.target] = params.id;
    const queryFields = mapFiltersToQueryFields(filter);
    const query = queryString.stringify({
      pageSize,
      sortField,
      sortDirection,
      ...queryFields
    })
    const response = await authorizedClient.get<RecordType>(`${apiRoot}/${resource}?${query}`);
    return {
      data: response.data.results,
      total: 1, // not used
    }
  }

  const update = async <RecordType extends Record = Record>(resource: string, params: UpdateParams):Promise<UpdateResult<RecordType>> => {

    const response = await authorizedClient.put<RecordType>(
      `${apiRoot}/${resource}/${params.id}`,
      params
    );
    return Promise.resolve({data: response.data});
  }

  const updateMany = (resource: string, params: UpdateManyParams):Promise<UpdateManyResult> => {
    const data:any = {};
    return Promise.resolve({data});
  }

  const create = async <RecordType extends Record = Record>(resource: string, params: CreateParams):Promise<CreateResult<RecordType>> => {
    const response = await authorizedClient.post<RecordType>(
      `${apiRoot}/${resource}`,
      params,
    );
    return Promise.resolve({data: response.data});
  }

  const deleteOne = <RecordType extends Record = Record>(resource: string, params: DeleteParams):Promise<DeleteResult<RecordType>> => {
    const data:any = {};
    return Promise.resolve({data});
  }

  const deleteMany = (resource: string, params: DeleteManyParams):Promise<DeleteManyResult> => {
    const data:any = {};
    return Promise.resolve({data});
  }

  return {
    create,
    delete: deleteOne,
    deleteMany,
    update,
    updateMany,
    getOne,
    getList,
    getMany,
    getManyReference,
  }
}