import {Create} from "../../../database/Entity";
import {SetPriceStatsEntity} from "./SetPriceStatsEntity";
import {logger} from "firebase-functions";
import {setPriceStatsRepository} from "./SetPriceStatsRepository";


const create = async (createStats:Create<SetPriceStatsEntity>):Promise<SetPriceStatsEntity> => {
  logger.info(`Creating new set stats for set: ${createStats.setId}`);
  const createdStats = await setPriceStatsRepository.create(createStats);
  logger.info(`Created new set stats for set: ${createStats.setId}, with id: ${createdStats.id}`);
  return createdStats;
}

export const setPriceStatsCreator = {
  create,
}