import {CardPriceDataImportAttemptEntity, ImportType} from "./CardPriceDataImportAttemptEntity";
import {handleAllErrors} from "../../tools/AllPromiseHandler";
import {tcgPlayerCardDataImportProcessor} from "../tcg-player/TcgPlayerCardDataImportProcessor";
import {UnexpectedError} from "../../error/UnexpectedError";
import {cardPriceDataImportAttemptRetriever} from "./CardPriceDataImportAttemptRetriever";
import {logger} from "firebase-functions";

const MAX_ATTEMPTS = 10;

const processAttempt = (attempt:CardPriceDataImportAttemptEntity):Promise<CardPriceDataImportAttemptEntity> => {
  const importType:ImportType = attempt.importType;
  if (importType === ImportType.TCG_PLAYER_MARKET_DATA) {
    return tcgPlayerCardDataImportProcessor.process(attempt);
  }
  throw new UnexpectedError(`Unrecognised import type: ${importType}`);
}

const process = async (importType:ImportType):Promise<Array<CardPriceDataImportAttemptEntity>> => {
  const unfinishedAttempts:Array<CardPriceDataImportAttemptEntity> = await cardPriceDataImportAttemptRetriever.retrieveUnfinishedAttempts(MAX_ATTEMPTS, importType);
  if (unfinishedAttempts.length === 0) {
    logger.info("There are no unfinished card price import attempts");
    return [];
  }
  logger.info(`Attempting to process ${unfinishedAttempts.length} card price data import attempts with ids: ${unfinishedAttempts.map(at => at.id).join(',')}`);
  const attemptsBeingProcessed:Array<Promise<CardPriceDataImportAttemptEntity>> = unfinishedAttempts.map(attempt => processAttempt(attempt));
  const finishedAttempts:Array<CardPriceDataImportAttemptEntity> = await handleAllErrors(attemptsBeingProcessed, `Failed to process attempt`);
  logger.info(`Finished processing ${finishedAttempts.length} attempts with ids: ${finishedAttempts.map(at => at.id).join(',')}`);
  return Promise.resolve(finishedAttempts);
}

export const cardPriceDataImportAttemptProcessor = {
  process,
}