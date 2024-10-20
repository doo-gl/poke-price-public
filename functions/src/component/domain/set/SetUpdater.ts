import {NotFoundError} from "../../error/NotFoundError";
import {SetEntity} from "./SetEntity";
import {setRepository} from "./SetRepository";
import {logger} from "firebase-functions";


const update = (id:string, setUpdate:Partial<SetEntity>):Promise<SetEntity> => {
  logger.info(`Updating set with id: ${id}, fields: ${Object.keys(setUpdate).join(',')}`);
  return setRepository.updateOne(id, setUpdate)
    .then(result => {
      if (!result) {
        throw new NotFoundError(`Failed to find set with id: ${id}`);
      }
      logger.info(`Updated set with id: ${id}`);
      return result;
    })
}

export const setUpdater = {
  update,
}