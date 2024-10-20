import {SetPriceStatsEntity} from "./SetPriceStatsEntity";
import {logger} from "firebase-functions";
import {NotFoundError} from "../../../error/NotFoundError";
import {setPriceStatsRepository} from "./SetPriceStatsRepository";


const update = (id:string, updateInfo:Partial<SetPriceStatsEntity>):Promise<SetPriceStatsEntity> => {
  logger.info(`Updating set price stats with id: ${id}, fields: ${Object.keys(updateInfo).join(',')}`);
  return setPriceStatsRepository.updateOne(id, updateInfo)
    .then(result => {
      if (!result) {
        throw new NotFoundError(`Failed to find set price stats with id: ${id}`);
      }
      logger.info(`Updated set price stats with id: ${id}`);
      return result;
    })
}

export const setPriceStatsUpdater = {
  update,
}