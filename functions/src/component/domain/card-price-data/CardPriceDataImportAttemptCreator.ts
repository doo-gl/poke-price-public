import {
  CardPriceDataImport,
  CardPriceDataImportAttemptEntity,
  CreateCardPriceDataImportAttemptEntity,
  SUB_STATE,
} from "./CardPriceDataImportAttemptEntity";
import {HistoricalState} from "../../database/StatefulEntity";
import {LoadingState} from "../../constants/LoadingState";
import {cardPriceDataImportAttemptRepository} from "./CardPriceDataImportAttemptRepository";
import {logger} from "firebase-functions";
import {TimestampStatic} from "../../external-lib/Firebase";


const create = async (cardPriceDataImport:CardPriceDataImport):Promise<CardPriceDataImportAttemptEntity> => {
  const state:HistoricalState = {
    state: LoadingState.NOT_STARTED,
    subState:SUB_STATE.NOT_STARTED.CREATED,
    dateStateStarted: TimestampStatic.now(),
    detail: {},
  }
  const createAttempt:CreateCardPriceDataImportAttemptEntity = {
    dateStateStarted: state.dateStateStarted,
    state: state.state,
    subState: state.subState,
    history: [state],
    importType: cardPriceDataImport.importType,
    importData: cardPriceDataImport.importData,
    parentImportId: cardPriceDataImport.parentImportId,
  };
  const attempt = await cardPriceDataImportAttemptRepository.create(createAttempt);
  logger.info(`Created card price data import attempt of type: ${createAttempt.importType}, id: ${attempt.id}`);
  return attempt;
}

export const cardPriceDataImportAttemptCreator = {
  create,
}