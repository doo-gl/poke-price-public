import {SetEntity} from "./SetEntity";
import {convertToKey} from "../../tools/KeyConverter";
import {setUpdater} from "./SetUpdater";
import {setRetriever} from "./SetRetriever";
import {handleAllErrors} from "../../tools/AllPromiseHandler";
import {cardPriceStatsRetriever} from "../stats/card/CardPriceStatsRetriever";
import {UniqueSet} from "./UniqueSet";
import {cardPriceStatsUpdater} from "../stats/card/CardPriceStatsUpdater";
import {setPriceStatsRetriever} from "../stats/set/SetPriceStatsRetriever";
import {logger} from "firebase-functions";
import {setPriceStatsUpdater} from "../stats/set/SetPriceStatsUpdater";
import {cardPriceDataImportAttemptRepository} from "../card-price-data/CardPriceDataImportAttemptRepository";
import {BatchUpdate} from "../../database/BaseCrudRepository";
import {CardPriceDataImportAttemptEntity} from "../card-price-data/CardPriceDataImportAttemptEntity";
import {cardItemRetriever} from "../item/CardItemRetriever";
import {toCard} from "../item/CardItem";
import {itemUpdater, SingleCardItemDetails} from "../item/ItemEntity";

const updateCardPriceDataImport = async (oldSet:UniqueSet, newName:string):Promise<void> => {
  await cardPriceDataImportAttemptRepository.iterator()
    .queries([
      { field: 'importData.set', operation: "==", value: oldSet.set },
    ])
    .sort([])
    .batchSize(500)
    .iterateBatch(async (entities) => {
      const updates:Array<BatchUpdate<CardPriceDataImportAttemptEntity>> = [];
      entities.forEach(entity => {
        updates.push({
          id: entity.id,
          update: { 'importData.set': newName },
        })
      })
      await cardPriceDataImportAttemptRepository.batchUpdate(updates);
      return false;
    })
}

const updateSetPriceStats = async (setId:string, newName:string) => {
  const stats = await setPriceStatsRetriever.retrieveStatsForSet(setId);
  if (!stats) {
    logger.info(`No set stats for set: ${setId}`)
    return;
  }
  await setPriceStatsUpdater.update(stats.id, { set: newName });
}

const updateCardPriceStats = async (oldSet:UniqueSet, newName:string):Promise<void> => {
  const stats = await cardPriceStatsRetriever.retrieveStatsForSet(oldSet);
  await handleAllErrors(
    stats.map(stat => cardPriceStatsUpdater.update(stat.id, { set: newName })),
    'Failed to update set name on card price stats'
  );
}

const updateCards = async (setId:string, newName:string):Promise<void> => {
  const cards = await cardItemRetriever.retrieveBySetId(setId);
  await handleAllErrors(
    cards.map(async card => {
      const details = toCard(card);
      if (!details) {
        return card;
      }
      const newDetails:SingleCardItemDetails = {
        ...details,
        set:newName,
        setDetails: {
          ...details.setDetails,
          name: newName,
        },
      }
      return itemUpdater.updateAndReturn(card._id, { itemDetails: newDetails })
    }),
    'Failed to update set name on card'
  );
}

const updateSet = async (setId:string, newName:string):Promise<SetEntity> => {
  return setUpdater.update(setId, { name: newName });
}

const rename = async (setId:string, oldName:string, newName:string):Promise<SetEntity> => {

  const newNameKey = convertToKey(newName);
  const oldSet = await setRetriever.retrieve(setId);
  const set = await updateSet(setId, newNameKey);
  await updateCardPriceStats({ series: oldSet.series, set: oldName }, newNameKey);
  await updateCardPriceDataImport({ series: oldSet.series, set: oldName }, newNameKey);
  await updateCards(setId, newNameKey);
  await updateSetPriceStats(setId, newNameKey);
  return set;
}

export const setRenamer = {
  rename,
}