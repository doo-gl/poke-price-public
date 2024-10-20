import {Create} from "../../../database/Entity";
import {singleResultRepoQuerier} from "../../../database/SingleResultRepoQuerier";
import {CardStatsEntityV2, cardStatsRepository} from "./CardStatsEntityV2";
import {byIdRetriever} from "../../../database/ByIdRetriever";
import {SortOrder} from "../../../database/BaseCrudRepository";
import {PriceType} from "./CardPriceSelectionEntity";
import {CurrencyCode} from "../../money/CurrencyCodes";
import {CardCondition} from "../../historical-card-price/CardCondition";


const retrievePreExisting = (create:Create<CardStatsEntityV2>):Promise<CardStatsEntityV2|null> => {
  return singleResultRepoQuerier.query(
    cardStatsRepository,
    [
      { name: "cardId", value: create.cardId },
      { name: "selectionId", value: create.selectionId },
      { name: "periodSizeDays", value: create.periodSizeDays },
    ],
    cardStatsRepository.collectionName
  )
}

const retrieveByCardIdAndPriceTypeAndCurrencyCodeAndCondition = (
  cardId:string,
  priceType:PriceType,
  currencyCode:CurrencyCode,
  condition:CardCondition
):Promise<Array<CardStatsEntityV2>> => {
  return cardStatsRepository.getMany([
    { field: 'cardId', operation: '==', value: cardId },
    { field: 'priceType', operation: '==', value: priceType },
    { field: 'currencyCode', operation: '==', value: currencyCode },
    { field: 'condition', operation: '==', value: condition },
  ])
}

const retrieve = (id:string):Promise<CardStatsEntityV2> => {
  return byIdRetriever.retrieve(
    cardStatsRepository,
    id,
    cardStatsRepository.collectionName
  );
}

const retrieveByNextCalculationTimeAsc = (limit:number):Promise<Array<CardStatsEntityV2>> => {
  return cardStatsRepository.getMany(
    [],
    {
      limit,
      sort: [ { field: "nextCalculationTime", order: SortOrder.ASC } ],
    }
  )
}

const retrieveForCardId = (cardId:string):Promise<Array<CardStatsEntityV2>> => {
  return cardStatsRepository.getMany([
    { field: "cardId", operation: "==", value: cardId },
  ])
}

const retrieveByCardIdAndPriceType = (cardId:string, priceType:PriceType):Promise<Array<CardStatsEntityV2>> => {
  return cardStatsRepository.getMany([
    { field: "cardId", operation: "==", value: cardId },
    { field: "priceType", operation: "==", value: priceType },
  ])
}

const retrieveByIds = (ids:Array<string>):Promise<Array<CardStatsEntityV2>> => {
  return cardStatsRepository.getManyById(ids)
}

const retrieveByItemId = (itemId:string):Promise<Array<CardStatsEntityV2>> => {
  return cardStatsRepository.getMany([
    { field: "itemIds", operation: "array-contains", value: itemId },
  ])
}

export const cardStatsRetrieverV2 = {
  retrievePreExisting,
  retrieve,
  retrieveByIds,
  retrieveByItemId,
  retrieveByNextCalculationTimeAsc,
  retrieveForCardId,
  retrieveByCardIdAndPriceType,
  retrieveByCardIdAndPriceTypeAndCurrencyCodeAndCondition,
}