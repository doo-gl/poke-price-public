import {CardDataSource} from "../card/CardDataSource";
import {BY_TIMESTAMP_ASC, HistoricalCardPriceEntity} from "./HistoricalCardPriceEntity";
import {historicalCardPriceRepository} from "./HistoricalCardPriceRepository";
import {singleResultRepoQuerier} from "../../database/SingleResultRepoQuerier";
import {byIdRetriever} from "../../database/ByIdRetriever";
import {SortOrder} from "../../database/BaseCrudRepository";
import {PriceDataType} from "./PriceDataType";
import {Moment} from "moment";
import {momentToTimestamp} from "../../tools/TimeConverter";
import {CurrencyCode} from "../money/CurrencyCodes";
import {CardCondition} from "./CardCondition";
import {PriceType} from "../stats/card-v2/CardPriceSelectionEntity";


const retrieveBySourceId = async (sourceType:CardDataSource, sourceId:string|null):Promise<HistoricalCardPriceEntity|null> => {
  if (!sourceId) {
    return null;
  }
  return singleResultRepoQuerier.query<HistoricalCardPriceEntity>(
    historicalCardPriceRepository,
    [
      {name: "sourceType", value: sourceType},
      {name: "sourceId", value: sourceId},
    ],
    "historical card price"
  );
}

const retrieveLastNPricesForSearch = async (
  cardId:string,
  searchId:string,
  priceType:PriceDataType,
  currencyCode:CurrencyCode,
  condition:CardCondition,
  numberOfPrices:number
):Promise<Array<HistoricalCardPriceEntity>> => {
  const prices = await historicalCardPriceRepository.getMany(
    [
      { field: "cardId", operation: "==", value: cardId },
      { field: "searchIds", operation: "array-contains", value: searchId },
      { field: "priceDataType", operation: "==", value: priceType },
      { field: "currencyAmount.currencyCode", operation: "==", value: currencyCode },
      { field: "condition", operation: "==", value: condition },
    ],
    {
      limit: numberOfPrices,
      sort: [
        { field: "timestamp", order: SortOrder.DESC },
      ],
    }
  );
  const sortedPrices = prices.sort(BY_TIMESTAMP_ASC);
  return sortedPrices;
}

const retrieveLastNPricesFromDataSource = async (cardId:string, dataSource:CardDataSource, numberOfPrices:number):Promise<Array<HistoricalCardPriceEntity>> => {
  const prices = await historicalCardPriceRepository.getMany(
    [
      { field: "cardId", operation: "==", value: cardId },
      { field: "sourceType", operation: "==", value: dataSource },
    ],
    {
      limit: numberOfPrices,
      sort: [
        { field: "timestamp", order: SortOrder.DESC },
      ],
    }
  );
  const sortedPrices = prices.sort(BY_TIMESTAMP_ASC);
  return sortedPrices;
}

const retrievePricesBetween = (
  cardId:string,
  searchId:string,
  priceType:PriceDataType,
  currencyCode:CurrencyCode,
  condition:CardCondition,
  from:Moment,
  to:Moment
):Promise<Array<HistoricalCardPriceEntity>> => {
  return historicalCardPriceRepository.getMany([
    { field: "cardId", operation: "==", value: cardId },
    { field: "priceDataType", operation: "==", value: priceType },
    { field: "currencyAmount.currencyCode", operation: "==", value: currencyCode },
    { field: "condition", operation: "==", value: condition },
    { field: "searchIds", operation: "array-contains", value: searchId },
    { field: "timestamp", operation: ">=", value: momentToTimestamp(from) },
    { field: "timestamp", operation: "<", value: momentToTimestamp(to) },
  ],
    {
      sort: [
        { field: "timestamp", order: SortOrder.ASC },
      ],
    }
  );
}

const retrieve = async (id:string):Promise<HistoricalCardPriceEntity> => {
  return byIdRetriever.retrieve(historicalCardPriceRepository, id, 'historical card price');
}

const retrieveBySearchId = async (searchId:string):Promise<Array<HistoricalCardPriceEntity>> => {
  return await historicalCardPriceRepository.getMany(
    [{ field: "searchIds", operation: "array-contains", value: searchId }]
  );
}

const retrieveMostRecent = (limit:number, startAfterId:string|null):Promise<Array<HistoricalCardPriceEntity>> => {
  return historicalCardPriceRepository.getMany(
    [],
    {
      limit,
      sort: [{field: "dateCreated", order: SortOrder.DESC}],
      startAfterId: startAfterId || undefined,
    }
  )
}

const retrieveByDateCreated = (from:Moment, to:Moment):Promise<Array<HistoricalCardPriceEntity>> => {
  return historicalCardPriceRepository.getMany([
    { field: 'dateCreated', operation: ">=", value: from },
    { field: 'dateCreated', operation: "<", value: to },
  ])
}

const retrieveByIds = (ids:Array<string>):Promise<Array<HistoricalCardPriceEntity>> => {
  return historicalCardPriceRepository.getManyById(ids);
}

const priceExists = async (
  searchId:string,
  priceDataType:PriceDataType,
  currencyCode:CurrencyCode,
  condition:CardCondition,
):Promise<boolean> => {
  const prices = await historicalCardPriceRepository.getMany(
    [
      { field: "condition", operation: "==", value: condition },
      { field: "currencyAmount.currencyCode", operation: "==", value: currencyCode },
      { field: "priceDataType", operation: "==", value: priceDataType },
      { field: "searchIds", operation: "array-contains", value: searchId },
    ],
    {limit: 1}
  )
  return prices.length > 0;
}

const retrieveBySelectionIdInTimeBounds = (selectionId:string, start:Moment, end:Moment):Promise<Array<HistoricalCardPriceEntity>> => {
  return historicalCardPriceRepository.getMany([
    { field: "selectionIds", operation: "array-contains", value: selectionId },
    { field: "timestamp", operation: ">=", value: momentToTimestamp(start) },
    { field: "timestamp", operation: "<", value: momentToTimestamp(end) },
  ]);
}

const retrieveByCardIdInTimeBounds = (cardId:string, start:Moment, end:Moment):Promise<Array<HistoricalCardPriceEntity>> => {
  return historicalCardPriceRepository.getMany([
    { field: "cardId", operation: "==", value: cardId },
    { field: "priceDataType", operation: "==", value: PriceDataType.SOLD_PRICE },
    { field: "timestamp", operation: ">=", value: momentToTimestamp(start) },
    { field: "timestamp", operation: "<", value: momentToTimestamp(end) },
  ]);
}

const retrieveBySelectionIdInTimestampDesc = (selectionId:string, limit:number) => {
  return historicalCardPriceRepository.getMany(
    [{ field: "selectionIds", operation: "array-contains", value: selectionId }],
    { limit, sort: [{ field: "timestamp", order: SortOrder.DESC }] }
  );
}

export const historicalCardPriceRetriever = {
  retrieveBySourceId,
  retrieve,
  retrieveLastNPricesFromDataSource,
  retrieveLastNPricesForSearch,
  retrievePricesBetween,
  retrieveBySearchId,
  retrieveMostRecent,
  retrieveByDateCreated,
  retrieveByIds,
  priceExists,
  retrieveBySelectionIdInTimeBounds,
  retrieveByCardIdInTimeBounds,
  retrieveBySelectionIdInTimestampDesc,
}