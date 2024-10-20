import {CardPriceStatsEntity} from "./CardPriceStatsEntity";
import {Update} from "../../../database/Entity";
import {logger} from "firebase-functions";
import {cardPriceStatsRepository} from "./CardPriceStatsRepository";


const update = async (id:string, updateStats:Update<CardPriceStatsEntity>):Promise<CardPriceStatsEntity|null> => {
  logger.info(`Updating card price stats with id: ${id}, fields: ${Object.keys(updateStats).join(',')}`);
  const result:CardPriceStatsEntity|null = await cardPriceStatsRepository.updateOne(id, updateStats);
  if (!result) {
    logger.info(`Could not update card price stats with id: ${id}, it does not exist`);
    return null;
  }
  logger.info(`Updated card price stats with id: ${id}`);
  return result;
}

export const cardPriceStatsUpdater = {
  update,
}