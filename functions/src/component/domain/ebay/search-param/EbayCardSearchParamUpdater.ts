import {EbayCardSearchParamEntity} from "./EbayCardSearchParamEntity";
import {Update} from "../../../database/Entity";
import {ebayCardSearchParamRepository} from "./EbayCardSearchParamRepository";
import {byIdUpdater} from "../../../database/ByIdUpdater";
import {logger} from "firebase-functions";
import {BatchUpdate} from "../../../database/BaseCrudRepository";


const update = async (id:string, updateEntity:Update<EbayCardSearchParamEntity>):Promise<EbayCardSearchParamEntity> => {

  logger.info(`Updating ebay search params with id: ${id}, fields: ${Object.keys(updateEntity).join(',')}`);
  const updatedEntity = await byIdUpdater.update<EbayCardSearchParamEntity>(
    ebayCardSearchParamRepository,
    'ebay card search param',
    id,
    updateEntity,
  );
  logger.info(`Updated ebay search params with id: ${id}`);
  return updatedEntity;
}

const batchUpdate = async (ids:Array<string>, updateEntity:Update<EbayCardSearchParamEntity>):Promise<number> => {

  logger.info(`Updating ebay search params with id: ${ids.join(',')}, fields: ${Object.keys(updateEntity).join(',')}`);
  const updates:Array<BatchUpdate<EbayCardSearchParamEntity>> = ids.map(id => {
    return {
      id,
      update: updateEntity,
    }
  })
  const result = await ebayCardSearchParamRepository.batchUpdate(updates);
  logger.info(`Updated ebay search params with id: ${ids.join(',')}`);
  return result;
}

export const ebaySearchParamUpdater = {
  update,
  batchUpdate,
}