import {
  attemptStateUpdater,
  CardPriceDataImportAttemptEntity,
  ImportData,
  SUB_STATE,
} from "./CardPriceDataImportAttemptEntity";
import {LoadingState} from "../../constants/LoadingState";
import {logger} from "firebase-functions";


const process = async (attempt:CardPriceDataImportAttemptEntity, importProcessor:() => Promise<void>):Promise<CardPriceDataImportAttemptEntity> => {
  const inProgressAttempt:CardPriceDataImportAttemptEntity = await attemptStateUpdater.updateStateAndReturn(
    attempt,
    LoadingState.IN_PROGRESS,
    SUB_STATE.IN_PROGRESS.STARTED,
    {}
  );
  try {
    logger.info(`Starting import ${attempt.importType} for attempt: ${attempt.id}`);
    await importProcessor();
    logger.info(`Successful import ${attempt.importType} for attempt: ${attempt.id}`);
    const successfulAttempt = await attemptStateUpdater.updateStateAndReturn(
      inProgressAttempt,
      LoadingState.SUCCESSFUL,
      SUB_STATE.SUCCESSFUL.FINISHED,
      {},
    );
    return Promise.resolve(successfulAttempt);
  } catch (err:any) {
    logger.error(`Failed to import ${attempt.importType} for attempt: ${attempt.id}`, err);
    const failedAttempt = await attemptStateUpdater.updateStateAndReturn(
      inProgressAttempt,
      LoadingState.FAILED,
      SUB_STATE.FAILED.ERRORED,
      {message: err.message},
    );
    return Promise.resolve(failedAttempt);
  }
}

export const cardPriceDataNotStartedAttemptProcessor = {
  process,
}