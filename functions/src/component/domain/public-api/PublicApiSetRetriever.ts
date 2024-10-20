import {PublicApiSetDto, publicApiSetMapper} from "./PublicApiSetMapper";
import {setRetriever} from "../set/SetRetriever";
import {ApiList} from "../PagingResults";
import {SetEntity} from "../set/SetEntity";
import {Query, QueryOptions} from "../../database/BaseCrudRepository";
import {PUBLIC_API_DEFAULT_LIMIT, PUBLIC_API_MAX_LIMIT} from "./PublicApiWebapp";
import {setRepository} from "../set/SetRepository";


const getOne = async (id:string):Promise<PublicApiSetDto> => {
  const set = await setRetriever.retrieve(id);
  return publicApiSetMapper.map(set)
}

export interface GetManySetRequest {
  set?:string,
  series?:string,
  fromId?:string,
  limit?:number,
}

const createQueries = (request:GetManySetRequest):Array<Query<SetEntity>> => {
  const queries:Array<Query<SetEntity>> = [
    { field: "visible", operation: "==", value: true },
  ];

  if (request.set) {
    queries.push({ field: "name", operation: "==", value: request.set })
  }
  if (request.series) {
    queries.push({ field: "series", operation: "==", value: request.series })
  }

  return queries;
}

const createQueryOptions = (request:GetManySetRequest):QueryOptions<SetEntity> => {
  const options:QueryOptions<SetEntity> = {
    limit: PUBLIC_API_DEFAULT_LIMIT,
  }
  if (request.limit) {
    options.limit = Math.min(request.limit, PUBLIC_API_MAX_LIMIT)
  }
  if (request.fromId) {
    options.startAfterId = request.fromId
  }
  return options
}

const getMany = async (request:GetManySetRequest):Promise<ApiList<PublicApiSetDto>> => {
  const queries = createQueries(request)
  const options = createQueryOptions(request)
  const sets = await setRepository.getMany(queries, options);
  const fromId = sets.length > 0 ? sets[sets.length - 1].id : null
  const setDtos = sets.map(set => publicApiSetMapper.map(set))
  return {
    results: setDtos,
    fromId,
  }
}

export const publicApiSetRetriever = {
  getOne,
  getMany,
}