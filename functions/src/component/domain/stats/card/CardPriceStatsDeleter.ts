import {cardPriceStatsRepository} from "./CardPriceStatsRepository";
import {logger} from "firebase-functions";


const deleteStats = async (id:string):Promise<boolean> => {
  logger.info(`Deleting card price stats with id: ${id}`)
  const result = await cardPriceStatsRepository.delete(id);
  logger.info(`Deleted card price stats with id: ${id}`);
  return result;
}

export const cardPriceStatsDeleter = {
  deleteStats,
}