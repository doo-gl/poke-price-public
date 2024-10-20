import {CardEntity} from "./CardEntity";
import {cardRepository} from "./CardRepository";
import {NotFoundError} from "../../error/NotFoundError";
import {logger} from "firebase-functions";
import {cardTagCalculator} from "./CardTagCalculator";
import {lodash} from "../../external-lib/Lodash";
import {cardQueryDetailBuilder} from "./query/CardQueryDetailBuilder";
import {cardPriorityCalculator} from "./CardPriorityCalculator";
import {Update} from "../../database/Entity";


const update = async (id:string, cardUpdate:Partial<CardEntity>):Promise<CardEntity> => {

  logger.info(`Updating card with id: ${id}, fields: ${Object.keys(cardUpdate).join(',')}`);
  let updatedCard = await cardRepository.updateOne(id, cardUpdate);
  if (!updatedCard) {
    throw new NotFoundError(`Failed to find card with id: ${id}`);
  }
  logger.info(`Updated card with id: ${id}`);

  const queryDetails = cardQueryDetailBuilder.calculateQueryDetails(updatedCard);
  const newTags = cardTagCalculator.calculateFromQueryDetails(queryDetails);
  const priority = cardPriorityCalculator.calculate(updatedCard);

  const postUpdate:Update<CardEntity> = {};

  if (lodash.isNotEqual(updatedCard.queryTags, newTags)) {
    logger.info(`Tags have changed on card: ${id}}`)
    postUpdate.queryTags = newTags
  }
  if (lodash.isNotEqual(updatedCard.queryDetails, queryDetails)) {
    logger.info(`Query details have changed on card: ${id}`)
    postUpdate.queryDetails = queryDetails
  }
  if (lodash.isNotEqual(updatedCard.priority, priority)) {
    logger.info(`Priority has changed on card: ${id}, updating to ${priority}`)
    postUpdate.priority = priority
  }


  if (Object.keys(postUpdate).length > 0) {
    updatedCard = await cardRepository.updateOne(id, postUpdate);
    if (!updatedCard) {
      throw new NotFoundError(`Failed to find card with id: ${id}`);
    }
    logger.info(`Updated ${Object.keys(postUpdate).join(', ')} on card with id: ${id}`);
  }

  return updatedCard;
}

export const cardUpdater = {
  update,
}