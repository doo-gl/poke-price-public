import {CreateSetEntity, SetEntity} from "./SetEntity";
import {setRepository} from "./SetRepository";
import {logger} from "firebase-functions";


const create = async (createSet:CreateSetEntity):Promise<SetEntity> => {
  logger.info(`Creating set with series: ${createSet.series}, set: ${createSet.name}`);
  const set = await setRepository.create(createSet);
  logger.info(`Created set with series: ${set.series}, set: ${set.name}, id: ${set.id}`);
  return set;
}

export const setCreator = {
  create,
}