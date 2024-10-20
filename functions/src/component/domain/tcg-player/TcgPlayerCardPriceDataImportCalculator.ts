import {SetEntity} from "../set/SetEntity";
import {setRepository} from "../set/SetRepository";
import {handleAllErrors} from "../../tools/AllPromiseHandler";
import {logger} from "firebase-functions";
import moment, {Moment} from "moment";
import {
  CardPriceDataImport,
  ImportType,
  TcgPlayerImportData,
} from "../card-price-data/CardPriceDataImportAttemptEntity";
import {removeNulls} from '../../tools/ArrayNullRemover';
import {cardPriceDataImportAttemptRetriever} from "../card-price-data/CardPriceDataImportAttemptRetriever";

const DAYS_BETWEEN_IMPORTS = 7;

const calculateNewCardDataImportForSet = async (set:SetEntity):Promise<CardPriceDataImport|null> => {
  const tcgPlayerUnfinishedImports = await cardPriceDataImportAttemptRetriever.retrieveUnfinishedTcgPlayerAttempts(set.id);

  if (tcgPlayerUnfinishedImports.length > 0) {
    logger.info(`Not creating new ${ImportType.TCG_PLAYER_MARKET_DATA} import attempts for set with id: ${set.id}, name: ${set.name}, found: ${tcgPlayerUnfinishedImports.length} unfinished attempts`);
    return Promise.resolve(null);
  }

  const startOfTimePeriod:Moment = moment().subtract(DAYS_BETWEEN_IMPORTS, "days");
  const importAttemptsFinishedWithinTimePeriod =
    await cardPriceDataImportAttemptRetriever.retrieveSuccessfulTcgAttemptsSince(set.id, startOfTimePeriod);

  if (importAttemptsFinishedWithinTimePeriod.length > 0) {
    logger.info(`Not creating new ${ImportType.TCG_PLAYER_MARKET_DATA} import attempts for set with id: ${set.id}, name: ${set.name}, found: ${importAttemptsFinishedWithinTimePeriod.length} attempts finished since ${startOfTimePeriod.toDate().toISOString()}`);
    return Promise.resolve(null);
  }
  const tcgPlayerImportData:TcgPlayerImportData = {
    setId: set.id,
  }
  const cardPriceDataImport:CardPriceDataImport = {
    importType: ImportType.TCG_PLAYER_MARKET_DATA,
    importData: tcgPlayerImportData,
    parentImportId: null,
  }
  return Promise.resolve(cardPriceDataImport);
}

const calculate = async ():Promise<Array<CardPriceDataImport>> => {
  const sets:Array<SetEntity> = await setRepository.getMany([]);
  const cardPriceDataImports:Array<CardPriceDataImport|null> = await handleAllErrors<CardPriceDataImport|null>(
    sets.map(set => calculateNewCardDataImportForSet(set)),
    `Failed to calculate card data import for a set`,
  )
  const denulledImports:Array<CardPriceDataImport> = removeNulls(cardPriceDataImports);
  return Promise.resolve(denulledImports);
};

export const tcgPlayerCardPriceDataImportCalculator = {
  calculate,
}