import {
  CardPriceDataImportAttemptEntity, extractTcgMarketImportData, ImportType,
  TcgPlayerImportData,
} from "../card-price-data/CardPriceDataImportAttemptEntity";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {LoadingState} from "../../constants/LoadingState";
import {logger} from "firebase-functions";
import {HistoricalCardPriceEntity} from "../historical-card-price/HistoricalCardPriceEntity";
import {tcgPlayerMarketDataSourcer} from "./TcgPlayerMarketDataSourcer";
import {SetEntity} from "../set/SetEntity";
import {setRetriever} from "../set/SetRetriever";
import {cardPriceDataImportTimeoutChecker} from "../card-price-data/CardPriceDataImportTimeoutChecker";
import {cardPriceDataNotStartedAttemptProcessor} from "../card-price-data/CardPriceDataNotStartedAttemptProcessor";
import {UnexpectedError} from "../../error/UnexpectedError";

const TIMEOUT_IN_MINUTES = 5;

const processAttemptAlreadyInProgress = (attempt:CardPriceDataImportAttemptEntity):Promise<CardPriceDataImportAttemptEntity> => {
  return cardPriceDataImportTimeoutChecker.checkForTimeout(attempt, TIMEOUT_IN_MINUTES);
}

const processNotStartedAttempt = async (attempt:CardPriceDataImportAttemptEntity):Promise<CardPriceDataImportAttemptEntity> => {
  return cardPriceDataNotStartedAttemptProcessor.process(
    attempt,
    async () => {
      const tcgImportData:TcgPlayerImportData = extractTcgMarketImportData(attempt);
      const setEntity:SetEntity = await setRetriever.retrieve(tcgImportData.setId);
      const series = setEntity.series;
      const set = setEntity.name;
      const sourcedData:Array<HistoricalCardPriceEntity> = await tcgPlayerMarketDataSourcer.source(series, set);
      if (sourcedData.length === 0) {
        throw new UnexpectedError(
          `Failed to source any price data from Tcg Player, this is an indication the import is broken. 
          Attempt Id: ${attempt.id}`
        )
      }
      logger.info(`Sourced ${sourcedData.length} card prices from Tcg Player`);
      return Promise.resolve();
    }
  )
}

const process = (attempt:CardPriceDataImportAttemptEntity):Promise<CardPriceDataImportAttemptEntity> => {
  if (attempt.importType !== ImportType.TCG_PLAYER_MARKET_DATA) {
    throw new InvalidArgumentError(`Cannot process a card data import not of type: ${ImportType.TCG_PLAYER_MARKET_DATA}, asked to process attempt with id: ${attempt.id}`);
  }
  if (attempt.state === LoadingState.FAILED || attempt.state === LoadingState.SUCCESSFUL) {
    logger.warn(`Cannot process already completed attempt with id: ${attempt.id}, that is in state: ${attempt.state}`);
    return Promise.resolve(attempt);
  }

  if (attempt.state === LoadingState.IN_PROGRESS) {
    return processAttemptAlreadyInProgress(attempt);
  }
  return processNotStartedAttempt(attempt);
}

export const tcgPlayerCardDataImportProcessor = {
  process,
}