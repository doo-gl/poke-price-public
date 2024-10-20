import {CardPriceDataImportAttemptDto} from "./CardPriceDataImportAttemptDto";
import {LoadingState} from "../../constants/LoadingState";
import {Moment} from "moment";
import {CardPriceDataImportAttemptEntity, ImportType} from "./CardPriceDataImportAttemptEntity";
import {Query} from "../../database/BaseCrudRepository";
import {InvalidArgumentError} from "../../error/InvalidArgumentError";
import {cardPriceDataImportAttemptRepository} from "./CardPriceDataImportAttemptRepository";
import {cardPriceDataImportAttemptDtoMapper} from "./CardPriceDataImportAttemptDtoMapper";

export interface CardPriceDataImportAttemptDtoRequest {
  state:LoadingState|null,
  dateStateStartedFrom:Moment|null,
  dateStateStartedTo:Moment|null,
  importType:ImportType|null,
  series:string|null,
  set:string|null,
  cardId:string|null,
}

const createQuery = (request:CardPriceDataImportAttemptDtoRequest):Array<Query<CardPriceDataImportAttemptEntity>> => {
  const query:Array<Query<CardPriceDataImportAttemptEntity>> = [];

  if (request.state) {
    query.push({field: "state", operation: "==", value: request.state});
  }
  if (request.importType) {
    query.push({field: "importType", operation: "==", value: request.importType});
  }
  if (request.dateStateStartedFrom) {
    query.push({field: "dateStateStarted", operation: ">=", value: request.dateStateStartedFrom});
  }
  if (request.dateStateStartedTo) {
    query.push({field: "dateStateStarted", operation: "<", value: request.dateStateStartedTo});
  }
  if (request.cardId) {
    if (request.importType !== null && request.importType !== ImportType.EBAY_SINGLE_CARD_SOLD_LISTINGS) {
      throw new InvalidArgumentError(`Cannot pull attempt data for a card id that isn't an import type: ${ImportType.EBAY_SINGLE_CARD_SOLD_LISTINGS}`);
    }
    query.push({field: "importData.cardId", operation: "==", value: request.cardId});
  }
  if (request.series) {
    if (
      request.importType !== null && !(request.importType === ImportType.EBAY_SET_SOLD_LISTINGS || request.importType === ImportType.EBAY_SINGLE_CARD_SOLD_LISTINGS)
    ) {
      throw new InvalidArgumentError(`Cannot pull attempt data for series that isn't an import type: ${ImportType.EBAY_SET_SOLD_LISTINGS} or ${ImportType.EBAY_SINGLE_CARD_SOLD_LISTINGS}`);
    }
    query.push({field: "importData.series", operation: "==", value: request.series});
  }
  if (request.set) {
    if (
      request.importType !== null && !(request.importType === ImportType.EBAY_SET_SOLD_LISTINGS || request.importType === ImportType.EBAY_SINGLE_CARD_SOLD_LISTINGS)
    ) {
      throw new InvalidArgumentError(`Cannot pull attempt data for set that isn't an import type: ${ImportType.EBAY_SET_SOLD_LISTINGS} or ${ImportType.EBAY_SINGLE_CARD_SOLD_LISTINGS}`);
    }
    if (!request.series) {
      throw new InvalidArgumentError(`Cannot pull attempt data for set without adding a series`);
    }
    query.push({field: "importData.set", operation: "==", value: request.set});
  }
  if (query.length === 0) {
    throw new InvalidArgumentError(`Cannot query card prices attempts without any parameters`)
  }
  return query;
}

const retrieve = async (request:CardPriceDataImportAttemptDtoRequest):Promise<Array<CardPriceDataImportAttemptDto>> => {
  const query:Array<Query<CardPriceDataImportAttemptEntity>> = createQuery(request);
  const attempts = await cardPriceDataImportAttemptRepository.getMany(query);
  return attempts.map(attempt =>  cardPriceDataImportAttemptDtoMapper.map(attempt));
}

export const cardPriceDataImportAttemptDtoRetriever = {
  retrieve,
}