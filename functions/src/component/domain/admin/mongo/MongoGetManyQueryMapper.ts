import QueryString from "qs";
import {GetManyRequestV2, Query, QueryOperation, SortDirection} from "../GetManyRequest";
import {
  enumWithDefault,
  nullableString,
  nullableStringArray,
  numberWithDefault,
  readParam,
} from "../../../tools/QueryParamReader";
import {InvalidArgumentError} from "../../../error/InvalidArgumentError";
import {comparatorBuilder} from "../../../infrastructure/ComparatorBuilder";
import {FieldTransforms} from "./MongoDomainEndpointBuilder";
import {MongoEntity} from "../../../database/mongo/MongoEntity";

export type QueryMapper<ENT extends MongoEntity> = (query:QueryString.ParsedQs) => GetManyRequestV2<ENT>

export interface QueryField {
  operation:QueryOperation,
  value:string|number|boolean,
}

export type FieldType = 'text'|'datetime'|'array-text'

export interface Field<T extends MongoEntity> {
  name:keyof T|string,
  type:FieldType,
  allowedValues?:Array<string>,
}

export interface CompoundFields<T extends MongoEntity> {
  fieldNames:Array<keyof T|string>
}

export interface QueryMetadata<T extends MongoEntity> {
  allowedCompoundFields:Array<CompoundFields<T>>,
  sortFields:Array<keyof T|string>,
  queryFields:Array<Field<T>>,
}

const validateQueryField = (queryKey:string, unvalidatedQuery:any):QueryField => {
  const keys = Object.keys(unvalidatedQuery);
  if (keys.length !== 1) {
    throw new InvalidArgumentError(`Param: ${queryKey} must have exactly one query param`);
  }
  const key = keys[0];
  const value:any = unvalidatedQuery[key];
  // TODO - validate value
  if (key === 'gt') {
    return { operation: "gt", value: value }
  }
  if (key === 'ge') {
    return { operation: "ge", value: value }
  }
  if (key === 'eq') {
    return { operation: "eq", value: value }
  }
  if (key === 'le') {
    return { operation: "le", value: value }
  }
  if (key === 'lt') {
    return { operation: "lt", value: value }
  }
  throw new InvalidArgumentError(`Param: ${queryKey} has unexpected operation: ${key}`)
}

const BY_FIELD_ASC = comparatorBuilder.objectAttributeASC<Query<MongoEntity>, string>(query => query.field)
const BY_STRING_ASC = comparatorBuilder.objectAttributeASC<any, string>(value => value)
const validateCompoundQuery = <ENT extends MongoEntity>(
  queries:Array<Query<ENT>>,
  allowedCompoundFields:Array<CompoundFields<ENT>>
) => {
  const queryFields = queries
    .map(query => query.field)
  const isAllowed = allowedCompoundFields.some(allowedCompoundField => {
    return queryFields.every(queryField => allowedCompoundField.fieldNames.some(field => field === queryField))
  })
  if (!isAllowed) {
    throw new InvalidArgumentError(`No compound index exists for fields: ${queryFields.join(", ")}`);
  }
}

export const buildQueryMapper = <ENT extends MongoEntity>(queryMetadata:QueryMetadata<ENT>, fieldTransforms:FieldTransforms):QueryMapper<ENT> => {
  return (query:QueryString.ParsedQs) => {
    const pageIndex = readParam(query, 'pageIndex', numberWithDefault(0));
    const pageSize = readParam(query, 'pageSize', numberWithDefault(20));
    let sortField = readParam(query, 'sortField', nullableString());
    const sortDirection = readParam(query, 'sortDirection', enumWithDefault<SortDirection>(SortDirection, SortDirection.ASC));
    const ids = readParam(query, 'ids', nullableStringArray());
    const remainingParams = Object.entries(query)
      .filter(
        entry => entry[0] !== 'pageIndex'
          && entry[0] !== 'pageSize'
          && entry[0] !== 'sortField'
          && entry[0] !== 'sortDirection'
          && entry[0] !== 'ids'
          && entry[0] !== 'basicAuth'
      );

    const isAllowedSortField = sortField === null
      || queryMetadata.sortFields.length === 0
      || queryMetadata.sortFields.some(allowedSortField => allowedSortField === sortField);

    if (!isAllowedSortField) {
      sortField = null
    }

    const queries:Array<Query<ENT>> = remainingParams.map<Query<ENT>>(param => {
      const key = param[0];
      const value = param[1];
      if (Array.isArray(value)) {
        throw new InvalidArgumentError(`Query param: ${key}, cannot be an array`);
      }
      if (value === undefined || value === null) {
        throw new InvalidArgumentError(`Query param: ${key}, must have a value`);
      }

      const isAllowedQueryField = queryMetadata.queryFields.length === 0
        || queryMetadata.queryFields.some(allowedQueryField => allowedQueryField.name === key);
      if (!isAllowedQueryField) {
        throw new InvalidArgumentError(`Query field: ${key} is not allowed, allowed options are: ${queryMetadata.queryFields.map(f => f.name).join(',')} or none`);
      }
      // @ts-ignore
      const jsonValue = JSON.parse(value);
      const field = queryMetadata.queryFields.filter(qf => qf.name === key)[0];
      const queryField = validateQueryField(key, jsonValue);
      const operation = queryField.operation
      const transform = fieldTransforms[key]
        ? fieldTransforms[key]
        : () => queryField.value;
      const transformedValue = transform(queryField.value);
      return { field: key, operation, value: transformedValue };
    });

    if (queries.length > 1) {
      validateCompoundQuery(queries, queryMetadata.allowedCompoundFields);
    }

    return {
      pageIndex,
      pageSize,
      // @ts-ignore
      sortField,
      sortDirection,
      ids,
      queries,
    }
  }
}
export const DEFAULT_QUERY_METADATA:QueryMetadata<MongoEntity> = {
  queryFields: [],
  sortFields: ['id'],
  allowedCompoundFields: [],
}
export const defaultQueryMapper = buildQueryMapper<MongoEntity>(DEFAULT_QUERY_METADATA, {})