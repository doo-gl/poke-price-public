import {NewsEntity} from "./NewsEntity";
import {byIdRetriever} from "../../database/ByIdRetriever";
import {newsRepository} from "./NewsRepository";


const retrieve = (id:string):Promise<NewsEntity> => {
  return byIdRetriever.retrieve(
    newsRepository,
    id,
    newsRepository.collectionName
  );
}

export const newsRetriever = {
  retrieve,
}