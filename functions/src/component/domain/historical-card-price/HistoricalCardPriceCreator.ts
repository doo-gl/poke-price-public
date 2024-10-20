import {CreateHistoricalCardPriceEntity, HistoricalCardPriceEntity} from "./HistoricalCardPriceEntity";
import {historicalCardPriceRetriever} from "./HistoricalCardPriceRetriever";
import {logger} from "firebase-functions";
import {historicalCardPriceRepository} from "./HistoricalCardPriceRepository";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {fromCurrencyAmountLike} from "../money/CurrencyAmount";
import {cardSelectionPriceReconciler} from "../stats/card-v2/CardSelectionPriceReconciler";
import {cardStatsNextCalculationUpdater} from "../stats/card-v2/CardStatsNextCalculationUpdater";

const create = async (createHistoricalCardPrice:CreateHistoricalCardPriceEntity):Promise<HistoricalCardPriceEntity> => {
  const preExistingHistoricalPrice:HistoricalCardPriceEntity|null = await historicalCardPriceRetriever.retrieveBySourceId(
    createHistoricalCardPrice.sourceType,
    createHistoricalCardPrice.sourceId
  );
  if (preExistingHistoricalPrice) {
    logger.info(`Found pre-existing historical card price with source type ${preExistingHistoricalPrice.sourceType}, id: ${preExistingHistoricalPrice.sourceId}, not creating a new one.`);
    return preExistingHistoricalPrice;
  }
  if (!Number.isSafeInteger(createHistoricalCardPrice.currencyAmount.amountInMinorUnits)) {
    throw new InvalidArgumentError(`Cannot create price with amount ${fromCurrencyAmountLike(createHistoricalCardPrice.currencyAmount).toString()}, it is not a safe integer amount`)
  }
  createHistoricalCardPrice.currencyAmount = {
    amountInMinorUnits: createHistoricalCardPrice.currencyAmount.amountInMinorUnits,
    currencyCode: createHistoricalCardPrice.currencyAmount.currencyCode,
  }
  logger.info(`Creating new historical card price from source type: ${createHistoricalCardPrice.sourceType}, and source id: ${createHistoricalCardPrice.sourceId}`);
  const newHistoricalCardPrice = await historicalCardPriceRepository.create(createHistoricalCardPrice);
  logger.info(`Created new historical card price with id: ${newHistoricalCardPrice.id}, from source type: ${newHistoricalCardPrice.sourceType}, and source id: ${newHistoricalCardPrice.sourceId}`);
  return newHistoricalCardPrice;
}

export const historicalCardPriceCreator = {
  create,
}