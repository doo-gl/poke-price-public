import {logger} from "firebase-functions";
import {TaskSupplierBuilder} from "../../../infrastructure/TaskSupplierBuilder";
import {taskRunner} from "../../../infrastructure/TaskRunner";
import moment from "moment/moment";
import {cardPokePriceUpdater} from "./CardPokePriceUpdater";
import {ItemEntity, itemRepository, legacyIdOrFallback} from "../../item/ItemEntity";
import {itemRetriever} from "../../item/ItemRetriever";


const TIME_TO_RUN_FOR_SECONDS = 300;
const MAX_CONCURRENT_TASKS = 8;

const processItem = async (card:ItemEntity) => {
  logger.info(`Calculating poke price for card: ${legacyIdOrFallback(card)}, was due at: ${card.nextPokePriceCalculationTime.toISOString()}`)

  await cardPokePriceUpdater.update(legacyIdOrFallback(card));

  logger.info(`Calculated poke price for card: ${legacyIdOrFallback(card)}`);
}

const process = async () => {

  const taskSupplier = new TaskSupplierBuilder<ItemEntity>()
    .dataName(itemRepository.collectionName)
    .idMapper(item => item._id.toString())
    .itemRetriever(async (limit:number) => {
      const items = await itemRetriever.retrieveByNextPokePriceCalculationTimeAsc(limit);
      return items.filter(item => moment(item.nextPokePriceCalculationTime).isSameOrBefore(moment()))
    })
    .minItemCount(MAX_CONCURRENT_TASKS)
    .taskMapper(item => processItem(item))
    .build();
  await taskRunner.runFor(
    TIME_TO_RUN_FOR_SECONDS,
    MAX_CONCURRENT_TASKS,
    taskSupplier,
    (err) => {
      logger.error(`Error while processing task`, err);
    }
  )

}

export const cardPokePriceCalculationJobProcessor = {
  process,
}