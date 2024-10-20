import {NewsEntity} from "./NewsEntity";
import {PublicNewsDto} from "./PublicNewsDto";
import {timestampToMoment} from "../../tools/TimeConverter";
import {NewsDto} from "./NewsDto";
import {entityDtoMapper} from "../EntityDtoMapper";


const mapPublic = (newsEntity:NewsEntity):PublicNewsDto => {
  return {
    newsId: newsEntity.id,
    date: timestampToMoment(newsEntity.date).format('YYYY-MM-DD'),
    category: newsEntity.category,
    backgroundImageUrl: newsEntity.backgroundImageUrl,
    imageUrl: newsEntity.imageUrl,
    newsLink: newsEntity.newsLink,
    title: newsEntity.title,
    description: newsEntity.description,
  }
}

const map = (entity:NewsEntity):NewsDto => {
  return {
    ...entityDtoMapper.map(entity),
    date: timestampToMoment(entity.date),
    category: entity.category,
    title: entity.title,
    description: entity.description,
    newsLink: entity.newsLink,
    backgroundImageUrl: entity.backgroundImageUrl,
    imageUrl: entity.imageUrl,
    active: entity.active,
  }
}

export const newsDtoMapper = {
  mapPublic,
  map,
}