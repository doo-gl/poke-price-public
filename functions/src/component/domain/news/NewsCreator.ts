import {NewsEntity} from "./NewsEntity";
import {Create} from "../../database/Entity";
import {logger} from "firebase-functions";
import {newsRepository} from "./NewsRepository";
import {jsonValidator} from "../../tools/JsonValidator";
import {momentToTimestamp} from "../../tools/TimeConverter";
import moment from "moment";
import {createNewsSchema} from "./NewsEndpoints";
import {publicNewsDtoRetriever} from "./PublicNewsDtoRetriever";


const create = async (news:Create<NewsEntity>):Promise<NewsEntity> => {

  news.active = false;
  logger.info(`Creating new news item`);
  const createdNews = await newsRepository.create(news);
  logger.info(`Created new news item with id: ${createdNews.id}`);
  await publicNewsDtoRetriever.clearCache();
  return createdNews;
}

const createFromDetails = (details:any):Promise<NewsEntity> => {
  const request = jsonValidator.validate(details, createNewsSchema);
  return newsCreator.create({
    title: request.title,
    description: request.description,
    category: request.category,
    date: momentToTimestamp(moment(request.date, 'YYYY-MM-DD')),
    active: false,
    newsLink: request.newsLink,
    imageUrl: request.imageUrl,
    backgroundImageUrl: request.backgroundImageUrl,
  })
}

export const newsCreator = {
  create,
  createFromDetails,
}