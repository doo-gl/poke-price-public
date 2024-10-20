import {logger} from "firebase-functions";
import {TaskSupplierBuilder} from "../../../infrastructure/TaskSupplierBuilder";
import {taskRunner} from "../../../infrastructure/TaskRunner";
import {cardStatsRepository} from "./CardStatsEntityV2";
import {cardStatsCalculator} from "./CardStatsCalculator";
import moment from "moment/moment";
import {ItemEntity, legacyIdOrFallback} from "../../item/ItemEntity";
import {itemRetriever} from "../../item/ItemRetriever";


const TIME_TO_RUN_FOR_SECONDS = 480;
const MAX_CONCURRENT_TASKS = 2;

const processItem = async (card:ItemEntity) => {
  logger.info(`Calculating stats for card: ${legacyIdOrFallback(card)}`)

  await cardStatsCalculator.calculateForCard(legacyIdOrFallback(card));

  logger.info(`Calculated stats for card: ${legacyIdOrFallback(card)}`);
}

const process = async () => {

  const taskSupplier = new TaskSupplierBuilder<ItemEntity>()
    .dataName(cardStatsRepository.collectionName)
    .idMapper(item => item._id.toString())
    .itemRetriever(async (limit:number) => {
      const cards = await itemRetriever.retrieveByNextStatsCalculationTimeAsc(limit);
      return cards.filter(card => moment(card.nextStatsCalculationTime).isSameOrBefore(moment()))
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

export const cardStatsCalculationJobProcessor = {
  process,
}