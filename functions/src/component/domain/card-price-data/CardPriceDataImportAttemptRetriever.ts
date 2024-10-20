import {CardPriceDataImportAttemptEntity, ImportType} from "./CardPriceDataImportAttemptEntity";
import {cardPriceDataImportAttemptRepository} from "./CardPriceDataImportAttemptRepository";
import {singleResultRepoQuerier} from "../../database/SingleResultRepoQuerier";
import {byIdRetriever} from "../../database/ByIdRetriever";
import {QueryOptions} from "../../database/BaseCrudRepository";
import {LoadingState} from "../../constants/LoadingState";
import {Moment} from "moment";
import {momentToTimestamp} from "../../tools/TimeConverter";

const DATA_NAME = 'card price data import attempt';

const retrieve = async (id:string):Promise<CardPriceDataImportAttemptEntity> => {
  return byIdRetriever.retrieve(cardPriceDataImportAttemptRepository, id, DATA_NAME);
}

const retrieveChildAttempts = (
  parentAttemptId:string,
  queryOptions:QueryOptions<CardPriceDataImportAttemptEntity>|null = null
):Promise<Array<CardPriceDataImportAttemptEntity>> => {
  return cardPriceDataImportAttemptRepository.getMany([
      {field: "parentImportId", operation: "==", value: parentAttemptId},
    ],
    queryOptions
  );
}

const retrieveChildAttemptsInStates = (
  parentAttemptId:string,
  states:Array<LoadingState>,
  queryOptions:QueryOptions<CardPriceDataImportAttemptEntity>|null = null
):Promise<Array<CardPriceDataImportAttemptEntity>> => {
  return cardPriceDataImportAttemptRepository.getMany(
    [
        {field: "parentImportId", operation: "==", value: parentAttemptId},
        {field: "state", operation: "in", value: states},
      ],
      queryOptions
    );
}

const retrieveParentAttempt = async (childAttemptId:string):Promise<CardPriceDataImportAttemptEntity|null> => {
  const child = await retrieve(childAttemptId);
  if (!child.parentImportId) {
    return null;
  }
  return singleResultRepoQuerier.query(
    cardPriceDataImportAttemptRepository,
    [{ name: "id", value: child.parentImportId }],
    DATA_NAME
  )
}

const retrieveUnfinishedAttemptsOfType = async (importType:ImportType):Promise<Array<CardPriceDataImportAttemptEntity>> => {
  return cardPriceDataImportAttemptRepository.getMany([
    { field: "state", operation: "in", value: [LoadingState.NOT_STARTED, LoadingState.IN_PROGRESS] },
    { field: "importType", operation: "==", value: importType },
  ])
}

const retrieveUnfinishedAttempts = async (limit:number, importType:ImportType) => {
  return await cardPriceDataImportAttemptRepository.getMany(
    [
      { field: 'state', operation: "in", value: [LoadingState.NOT_STARTED, LoadingState.IN_PROGRESS] },
      { field: 'importType', operation: "==", value: importType },
    ],
    {limit}
  );
}

const retrieveUnfinishedTcgPlayerAttempts = async (setId:string):Promise<Array<CardPriceDataImportAttemptEntity>> => {
  return cardPriceDataImportAttemptRepository.getMany([
    { field: 'state', operation: "in", value: [LoadingState.NOT_STARTED, LoadingState.IN_PROGRESS] },
    { field: 'importType', operation: "==", value: ImportType.TCG_PLAYER_MARKET_DATA },
    { field: 'importData.setId', operation: "==", value: setId },
  ]);
}

const retrieveSuccessfulAttemptsInTimeframe = async (importType:ImportType, start:Moment, end:Moment):Promise<Array<CardPriceDataImportAttemptEntity>> => {
  return cardPriceDataImportAttemptRepository.getMany([
    { field: "state", operation: "==", value: LoadingState.SUCCESSFUL },
    { field: "importType", operation: "==", value: importType },
    { field: "dateStateStarted", operation: ">=", value: momentToTimestamp(start) },
    { field: "dateStateStarted", operation: "<", value: momentToTimestamp(end) },
  ])
}

const retrieveSuccessfulTcgAttemptsSince = (setId:string, start:Moment):Promise<Array<CardPriceDataImportAttemptEntity>> => {
  return cardPriceDataImportAttemptRepository.getMany([
    { field: 'state', operation: "==", value: LoadingState.SUCCESSFUL },
    { field: 'importType', operation: "==", value: ImportType.TCG_PLAYER_MARKET_DATA },
    { field: 'importData.setId', operation: "==", value: setId },
    { field: 'dateStateStarted', operation: ">", value: momentToTimestamp(start) },
  ]);
}

export const cardPriceDataImportAttemptRetriever = {
  retrieveParentAttempt,
  retrieveChildAttempts,
  retrieveChildAttemptsInStates,
  retrieveUnfinishedAttemptsOfType,
  retrieveUnfinishedAttempts,
  retrieveSuccessfulAttemptsInTimeframe,
  retrieveUnfinishedTcgPlayerAttempts,
  retrieveSuccessfulTcgAttemptsSince,
}