import {handleAllErrors} from "../../tools/AllPromiseHandler";
import {logger} from "firebase-functions";
import {CardPriceDataImport, CardPriceDataImportAttemptEntity} from "./CardPriceDataImportAttemptEntity";
import {tcgPlayerCardPriceDataImportCalculator} from "../tcg-player/TcgPlayerCardPriceDataImportCalculator";
import {cardPriceDataImportAttemptCreator} from "./CardPriceDataImportAttemptCreator";

const calculateNewCardDataImports = async ():Promise<Array<CardPriceDataImport>> => {
  const imports:Array<CardPriceDataImport> = []
  const tcgPlayerImports:Array<CardPriceDataImport> = await tcgPlayerCardPriceDataImportCalculator.calculate();
  return imports
    .concat(tcgPlayerImports)
}

const source = async ():Promise<Array<CardPriceDataImportAttemptEntity>> => {

  const imports:Array<CardPriceDataImport> = await calculateNewCardDataImports();
  if (imports.length === 0) {
    logger.info("No new import attempts are needed right now")
    return [];
  }

  logger.info(`Found data for ${imports.length} new card date import attempts`)

  const attemptCreationPromises:Array<Promise<CardPriceDataImportAttemptEntity>> =
    imports.map(dataImport => cardPriceDataImportAttemptCreator.create(dataImport));

  const attempts:Array<CardPriceDataImportAttemptEntity> = await handleAllErrors(
    attemptCreationPromises,
    err => logger.error(`Failed to create import attempt`, err)
  );

  logger.info(`Created ${attempts.length} new import attempts`);

  return attempts;
}



export const cardPriceDataImportAttemptSourcer = {
  source,
}