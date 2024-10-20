import {Entity} from "../../database/Entity";
import QueryString from "qs";
import {GetManyRequest, SortDirection} from "./GetManyRequest";
import {
  enumWithDefault,
  nullableString,
  nullableStringArray,
  numberWithDefault,
  readParam,
} from "../../tools/QueryParamReader";
import {Query} from "../../database/BaseCrudRepository";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {UnexpectedError} from "../../error/UnexpectedError";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {FieldTransforms} from "./DomainEndpointBuilder";

export type QueryMapper<ENT extends Entity> = (query:QueryString.ParsedQs) => GetManyRequest<ENT>

export interface QueryField {
  operation:'eq'|'gt'|'lt'|'ge'|'le',
  value:string|number|boolean,
}

export type FieldType = 'text'|'datetime'|'array-text'

export interface Field<T extends Entity> {
  name:keyof T|string,
  type:FieldType,
  allowedValues?:Array<string>,
}

export interface CompoundFields<T extends Entity> {
  fieldNames:Array<keyof T|string>
}

export interface QueryMetadata<T extends Entity> {
  allowedCompoundFields:Array<CompoundFields<T>>,
  sortFields:Array<keyof T|string>,
  queryFields:Array<Field<T>>,
}

const OPERATION_MAPPINGS:{[key:string]: FirebaseFirestore.WhereFilterOp} = {
  'ge': '>=',
  'gt': '>',
  'eq': '==',
  'lt': '<',
  'le': '<=',
}

const mapOperation = (operation:string, fieldType:FieldType):FirebaseFirestore.WhereFilterOp|undefined => {
  if (operation === 'eq' && fieldType === "array-text") {
    return 'array-contains';
  }
  return OPERATION_MAPPINGS[operation];
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

const BY_FIELD_ASC = comparatorBuilder.objectAttributeASC<Query<Entity>, string>(query => query.field)
const BY_STRING_ASC = comparatorBuilder.objectAttributeASC<any, string>(value => value)
const validateCompoundQuery = <ENT extends Entity>(
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

export const buildQueryMapper = <ENT extends Entity>(queryMetadata:QueryMetadata<ENT>, fieldTransforms:FieldTransforms):QueryMapper<ENT> => {
  return (query:QueryString.ParsedQs) => {
    const startAfterId = readParam(query, 'startAfterId', nullableString());
    const endAtId = readParam(query, 'endAtId', nullableString());
    const pageSize = readParam(query, 'pageSize', numberWithDefault(10));
    let sortField = readParam(query, 'sortField', nullableString());
    const sortDirection = readParam(query, 'sortDirection', enumWithDefault<SortDirection>(SortDirection, SortDirection.ASC));
    const ids = readParam(query, 'ids', nullableStringArray());
    const remainingParams = Object.entries(query)
      .filter(
        entry => entry[0] !== 'startAfterId'
          && entry[0] !== 'endAtId'
          && entry[0] !== 'pageIndex'
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
      throw new InvalidArgumentError(`Sort field: ${sortField} is not allowed, allowed options are: ${queryMetadata.sortFields.join(',')} or none`);
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
      const operation = mapOperation(queryField.operation, field.type);
      if (!operation) {
        throw new UnexpectedError(`Unimplemented operation: ${queryField.operation}`)
      }
      const transform = fieldTransforms[key]
        ? fieldTransforms[key]
        : () => queryField.value;
      const transformedValue = transform(queryField.value);
      return { field: key, operation, value: transformedValue };
    });

    if (queries.length === 1 && queries[0].operation === '==' && queries[0].field === sortField) {
      // if we are looking for a single field we are also searching by, no need to sort
      sortField = null;
    }

    if (queries.length > 1) {
      validateCompoundQuery(queries, queryMetadata.allowedCompoundFields);
    }

    return {
      startAfterId,
      endAtId,
      pageSize,
      // @ts-ignore
      sortField,
      sortDirection,
      ids,
      queries,
    }
  }
}
export const DEFAULT_QUERY_METADATA:QueryMetadata<Entity> = {
  queryFields: [],
  sortFields: ['id'],
  allowedCompoundFields: [],
}
export const defaultQueryMapper = buildQueryMapper<Entity>(DEFAULT_QUERY_METADATA, {})