import {PublicNewsDto} from "./PublicNewsDto";
import {newsRepository} from "./NewsRepository";
import {SortOrder} from "../../database/BaseCrudRepository";
import {newsDtoMapper} from "./NewsDtoMapper";
import {cacheBuilder} from "../../database/cache/Cache";

const CACHE_ENTRY_TYPE = 'PUBLIC_NEWS_DTO';

const retrieveMany = async ():Promise<Array<PublicNewsDto>> => {
  const newsEntities = await newsRepository.getMany(
    [{ field: "active", operation: "==", value: true }],
    {
      sort: [ {field: "date", order: SortOrder.DESC} ],
      limit: 20,
    }
  );
  return newsEntities.map(news => newsDtoMapper.mapPublic(news));
}

type RetrieveManyPublicNewsRequest = {}

const GET_MANY_CACHE = cacheBuilder<RetrieveManyPublicNewsRequest, Array<PublicNewsDto>>()
  .entryLifetimeInMinutes(60)
  .build(() => retrieveMany());

const retrieveManyCached = ():Promise<Array<PublicNewsDto>> => {
  return GET_MANY_CACHE.get(CACHE_ENTRY_TYPE, {});
}

const clearCache = async () => {
  await GET_MANY_CACHE.clear(CACHE_ENTRY_TYPE);
}

export const publicNewsDtoRetriever = {
  retrieveMany,
  retrieveManyCached,
  clearCache,
}