import {logger} from "firebase-functions";
import {TaskSupplierBuilder} from "../../../infrastructure/TaskSupplierBuilder";
import {taskRunner} from "../../../infrastructure/TaskRunner";
import {CardPriceSelectionEntity, cardPriceSelectionRepository} from "./CardPriceSelectionEntity";
import {cardPriceSelectionRetriever} from "./CardPriceSelectionRetriever";
import {cardSelectionReconciler} from "./CardSelectionReconciler";


const TIME_TO_RUN_FOR_SECONDS = 480;
const MAX_CONCURRENT_TASKS = 4;

const processSelection = async (selection:CardPriceSelectionEntity) => {
  logger.info(`Reconciling selection: ${selection.id}.`)

  await cardSelectionReconciler.reconcileForSelection(selection);

  logger.info(`Reconciled selection: ${selection.id}.`);
}

const process = async () => {

  const taskSupplier = new TaskSupplierBuilder<CardPriceSelectionEntity>()
    .dataName(cardPriceSelectionRepository.collectionName)
    .idMapper(item => item.id)
    .itemRetriever(async (limit:number) => {
      return cardPriceSelectionRetriever.retrieveSelectionsToReconcile(limit);
    })
    .minItemCount(MAX_CONCURRENT_TASKS)
    .taskMapper(item => processSelection(item))
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

export const cardSelectionReconcileJobProcessor = {
  process,
}
