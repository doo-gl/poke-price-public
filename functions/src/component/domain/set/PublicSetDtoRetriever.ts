import {PublicSetDto} from "./PublicSetDto";
import {setRetriever} from "./SetRetriever";
import {setDtoMapper} from "./SetDtoMapper";
import {cacheBuilder} from "../../database/cache/Cache";
import {comparatorBuilder} from "../../infrastructure/ComparatorBuilder";
import {SetEntity} from "./SetEntity";
import {Query, Sort, SortOrder} from "../../database/BaseCrudRepository";
import {setRepository} from "./SetRepository";

const CACHE_ENTRY_TYPE = 'PUBLIC_SET_DTO'

const retrieve = async (setId:string):Promise<PublicSetDto> => {
  const set = await setRetriever.retrieve(setId);
  return setDtoMapper.mapPublic(set);
}

type SetIdQuery = { setId:string }
const GET_BY_SET_ID_CACHE = cacheBuilder<SetIdQuery, PublicSetDto>()
  .entryLifetimeInMinutes(60)
  .build(query => retrieve(query.setId));

const retrieveCached = async (setId:string):Promise<PublicSetDto> => {
  return GET_BY_SET_ID_CACHE.get(CACHE_ENTRY_TYPE, { setId });
}

export type RetrieveManyPublicSetRequest = {
  searchKey:string|null,
}
const BY_RELEASE_DATE_DESC = comparatorBuilder.objectAttributeDESC<SetEntity, number|null|undefined>(set => set.releaseDate.toMillis())

const retrieveMany = async (request:RetrieveManyPublicSetRequest):Promise<Array<PublicSetDto>> => {

  const queries:Array<Query<SetEntity>> = [
    { field: "visible", operation: "==", value: true },
  ];
  let sort:Array<Sort<SetEntity>> = [
    {field: "releaseDate", order: SortOrder.DESC},
    {field: "id", order: SortOrder.ASC},
  ]

  if (request.searchKey) {
    // poor mans name search
    // essentially just doing a prefix search for names between search key and search key + zzzzzzzzzzzzzzzzzzzzzzzzzzzz
    // should be replaced with an actual search when there is time
    const searchKey = request.searchKey;
    queries.push({ field: "name", operation: ">=", value: searchKey });
    queries.push({ field: "name", operation: "<=", value: `${searchKey}zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz` });
    sort = [{field: "name", order: SortOrder.ASC}, {field: "id", order: SortOrder.ASC}];
  }


  const sets = await setRepository.getMany(queries, {limit: 200, sort});
  return sets
    .filter(set => !!set.pokePrice)
    .sort(BY_RELEASE_DATE_DESC)
    .map(set => setDtoMapper.mapPublic(set));
}

const GET_MANY_CACHE = cacheBuilder<RetrieveManyPublicSetRequest, Array<PublicSetDto>>()
  .entryLifetimeInMinutes(60)
  .build(query => retrieveMany(query));

const retrieveManyCached = async (request:RetrieveManyPublicSetRequest):Promise<Array<PublicSetDto>> => {
  return GET_MANY_CACHE.get(CACHE_ENTRY_TYPE, request);
}

export const publicSetDtoRetriever = {
  retrieve,
  retrieveCached,
  retrieveMany,
  retrieveManyCached,
}