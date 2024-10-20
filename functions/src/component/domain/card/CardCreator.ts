import {logger} from "firebase-functions";
import {CardEntity, CreateCardEntity} from "./CardEntity";
import {cardRepository} from "./CardRepository";
import {cardSlugGenerator} from "./seo/CardSlugGenerator";
import {cardUpdater} from "./CardUpdater";


const create = async (createCard:CreateCardEntity):Promise<CardEntity> => {
  logger.info(`Creating card with series: ${createCard.series}, set: ${createCard.set}, name: ${createCard.name}`);
  const card = await cardRepository.create(createCard);
  const slug = cardSlugGenerator.generate(card);
  const updatedCard = await cardUpdater.update(card.id, {slug})
  logger.info(`Created card with series: ${card.series}, set: ${card.set}, name: ${card.name}, id: ${card.id}`);
  return updatedCard;
}

export const cardCreator = {
  create,
}